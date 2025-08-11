import { Experience, ExperienceAttributes } from "../models/experience";
import { Education, EducationAttributes } from "../models/education";
import redis from "../utils/ioredis";
import { geminiClient } from "../utils/geminiClient";
import { ExperienceAiOutput } from "../models/aiTypes";
import { EducationAiOutput } from "../models/aiTypes";
import { config } from "../config";
import { logger } from "../utils/logger";
import { normalizeExperienceAiOutput } from "../utils/titleNormalizer";
import { retryMemberUpdate } from "../utils/retryDbOperation";
import dotenv from "dotenv";
import { normalizeEducationCacheKey } from "../utils/educationNormalizer";

dotenv.config();

export async function standardizeMember(
  objects: ExperienceAttributes[] | EducationAttributes[],
  target: string // "experience" | "education"
) {
  const batchId = `batch-${target}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (objects.length === 0) {
    logger.warn("No objects to standardize.");
    return;
  }

  const cacheKeyPrefix = target === "experience"
    ? (config.titleCacheKey || "EXP")
    : (config.eduCacheKey || "EDU");

  const hits: Record<string, any> = {};
  const miss: string[] = [];
  const failedMemberIds: number[] = [];
  const titleToNormalized: Record<string, string> = {};

  // Step 1: Cache check
  const redisPromises = objects.map(async (obj) => {
    let rawKey: string | string[], normalized: string;
    if (target === "experience") {
      rawKey = (obj as ExperienceAttributes).title;
      normalized = normalizeExperienceAiOutput(rawKey).normalized;
    } else {
      rawKey = (obj as EducationAttributes).degrees || [""];
      rawKey = rawKey.join(' ')
      normalized = normalizeEducationCacheKey(rawKey).normalized;
    }

    titleToNormalized[rawKey] = normalized;
    const cacheKey = `${cacheKeyPrefix}:${normalized}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        hits[rawKey] = JSON.parse(cached);
        // logger.info(`Cache hit for "${rawKey}", Normalized: "${normalized}"`);
      } else {
        miss.push(rawKey);
        // logger.info(`Cache miss for "${rawKey}", Normalized: "${normalized}"`);
      }
    } catch (err) {
      logger.error(`[${batchId}] Redis error for ${rawKey}/${normalized}:`, err);
      failedMemberIds.push((obj as any).id);
    }
  });
  await Promise.allSettled(redisPromises);
  logger.info('----------------------------')
  logger.info(`hits findme len (before ai call)${Object.keys(hits).length}`)
  logger.info(`Miss findme len (before ai call)${miss.length}`)
  logger.info(`failed-ai findme len (before ai cache call)${failedMemberIds.length}`)

  logger.info('----------------------------');
  logger.info(`\n`)

  let standardizedMiss: ExperienceAiOutput[] | EducationAiOutput[] = [];
  if (miss.length > 0) {
    try {
      if (target === "experience") {
        standardizedMiss = await geminiClient.classifyExperienceAiOutputs(miss) as ExperienceAiOutput[];
      } else {
        standardizedMiss = await geminiClient.classifyEducation(miss) as EducationAiOutput[];
      }
      logger.info(`Miss-ai findme len (after ai call - before validation) input: ${miss.length} output: ${standardizedMiss.length}`)

      // After getting standardizedMiss, handle validation failures
      for (const item of standardizedMiss) {
        if (item.validationStatus === false) {
          let failedId: number | undefined;
          if (target === "experience") {
            const found = objects.find(
              (m) => (m as ExperienceAttributes).title === (item as any).title
            );
            failedId = found ? found.id : undefined;
          } else {
            const found = objects.find(
              (m) => (m as EducationAttributes).degrees === (item as any).education
            );
            failedId = found ? found.id : undefined;
          }
          if (failedId !== undefined) {
            logger.info('pushed failed after ai stand and valid, findme2')
            failedMemberIds.push(failedId);
          }
        }
      }

      logger.info('----------------------------');

      logger.info(`validation-ai findme len (after ai validation call): ${standardizedMiss.length}`)
      logger.info(`failed-ai findme len (after ai validation call): ${failedMemberIds.length}`)

      logger.info('----------------------------');
      logger.info(`\n`)


    } catch (err) {
      logger.error(`[${batchId}] Gemini classification failed: ${err}`);
      const missedIds = objects
        .filter((m: ExperienceAttributes | EducationAttributes) => {
          if (target === "experience") return miss.includes((m as ExperienceAttributes).title);
          else {
            const degree = (m as EducationAttributes).degrees || "";
            return miss.includes(`${degree}`);
          }
        })
        .map((m) => m.id);
      logger.info(`pushing failed members on catch error for gemini classification ${missedIds}`)
      failedMemberIds.push(...missedIds);
    }
  }

  try {
    const pipeline = redis.pipeline();
    for (const result of standardizedMiss) {
      let rawKey: string, normalized: string;
      if (target === "experience") {
        rawKey = (result as ExperienceAiOutput).title;
        normalized = titleToNormalized[rawKey];
      } else {
        rawKey = (result as EducationAiOutput).education;
        normalized = titleToNormalized[rawKey];
      }

      if (!normalized) continue;
      const key = `${cacheKeyPrefix}:${normalized}`;
      pipeline.set(key, JSON.stringify(result));
      hits[rawKey] = result;
    }
    await pipeline.exec();
  } catch (err) {
    logger.error(`[${batchId}] Failed to write to Redis: ${err}`);
  }



  // Update objects in database
  for (const obj of objects) {
    let standardized: EducationAiOutput | ExperienceAiOutput, id: number;

    if (target === "experience") {
      standardized = hits[(obj as ExperienceAttributes).title] as ExperienceAiOutput;
      id = (obj as ExperienceAttributes).id;
      if (!standardized) {
        logger.info(`pushing a failed id trying to update the db ${id}`)
        failedMemberIds.push(id)
      };
      if ((obj as ExperienceAttributes).title_standerlization_status === "standardized") {
        logger.info(`[${batchId}] Skipping already-standardized obj: ${id}`);
      }
      try {
        await retryMemberUpdate(
          'experience',
          {
            title_standerlization_status: "standardized",
            standardized_title: standardized.title,
            department: standardized.department,
            function: Array.isArray(standardized.function)
              ? standardized.function
              : [standardized.function],
            seniority: standardized.seniority_level,
          },
          { where: { id: Number(id) } }
        );
      } catch (err) {
        logger.error(`[${batchId}] DB update failed for obj ID ${id}:`, err);
      }
    } else {
      const degree = (obj as EducationAttributes).degrees || [""];
      const rawKey = degree.join(' ');
      standardized = hits[rawKey] as EducationAiOutput;

      id = (obj as EducationAttributes).id;
      if (!standardized) {
        logger.info(`pushing a failed id trying to update the db ${id}`)
        failedMemberIds.push(id)
      }
      if ((obj as any).education_standardize_status === "standardized") {
        logger.info(`[${batchId}] Skipping already-standardized obj: ${id}`);
        continue;
      }
      try {
        await retryMemberUpdate(
          'education',
          {
            education_standardize_status: "standardized",
            standardize_degree: standardized.degree,
            standardize_major: standardized.major,
          },
          { where: { id: Number(id) } }
        );
      } catch (err) {
        logger.error(`[${batchId}] DB update failed for education ID ${id}:`, err);
      }
    }
  }

  // Handle failed objects
  if (failedMemberIds.length > 0) {
    try {
      if (target === "experience") {
        await Experience.update(
          { title_standerlization_status: "failed" },
          { where: { id: failedMemberIds } }
        );
      } else {
        await Education.update(
          { education_standardize_status: "failed" },
          { where: { id: failedMemberIds } }
        );
      }
      logger.warn(
        `[${batchId}] Marked ${failedMemberIds.length} ${target} as 'failed' with ${objects.length} total input for the worker`
      );
    } catch (err) {
      logger.error(`[${batchId}] Failed to update 'failed' statuses: ${err}`);
    }
  }

  logger.info(`[${batchId}] Standardization completed for batch.`);
}
