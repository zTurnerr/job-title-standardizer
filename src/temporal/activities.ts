import { Experience, ExperienceAttributes } from "../models/experience";
import { Education, EducationAttributes } from "../models/education";
import redis from "../utils/ioredis";
import { openaiClient } from "../utils/openaiClient.deprecated";
import { geminiClient } from "../utils/geminiClient";
import { ExperienceAiOutput } from "../models/aiTypes";
import { EducationAiOutput } from "../models/aiTypes";
import { config } from "../config";
import { logger } from "../utils/logger";
import { normalizeExperienceAiOutput } from "../utils/titleNormalizer";
import { retryMemberUpdate } from "../utils/retryDbOperation";
import dotenv from "dotenv";

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

  const cacheKeyPrefix = target === "experience" ? config.titleCacheKey : config.eduCacheKey || "edu";
  const hits: Record<string, any> = {};
  const miss: string[] = [];
  const failedMemberIds: number[] = [];
  const titleToNormalized: Record<string, string> = {};

  // Step 1: Cache check
  const redisPromises = objects.map(async (obj) => {
    let rawKey: string, normalized: string;

    if (target === "experience") {
      // @ts-ignore
      rawKey = (obj as ExperienceAttributes).title;
      normalized = normalizeExperienceAiOutput(rawKey).normalized;
    } else {
      const degree = (obj as EducationAttributes).degrees || "";
      normalized = rawKey = `${degree}`;
      logger.info(`setting raw key and normizlaied : ${rawKey}`)
    }
    titleToNormalized[rawKey] = normalized;
    const cacheKey = `${cacheKeyPrefix}:${normalized}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        hits[rawKey] = JSON.parse(cached);
        logger.info(`Cache hit for "${rawKey}", Normalized: "${normalized}"`);
      } else {
        miss.push(rawKey);
        logger.info(`Cache miss for "${rawKey}", Normalized: "${normalized}"`);
      }
    } catch (err) {
      logger.error(`[${batchId}] Redis error for ${rawKey}/${normalized}:`, err);
      failedMemberIds.push((obj as any).id);
    }
  });
  await Promise.allSettled(redisPromises);

  logger.info(
    `[${batchId}] Cache check complete. Hits: ${Object.keys(hits).length}, Misses: ${miss.length} \n\n`
  );

  let standardizedMiss: ExperienceAiOutput[] | EducationAiOutput [] = [];
  if (miss.length > 0) {
    try {
      if (target === "experience") {
        standardizedMiss = await geminiClient.classifyExperienceAiOutputs(miss) as ExperienceAiOutput[];
      } else {
        standardizedMiss = await geminiClient.classifyEducation(miss) as EducationAiOutput[];
      }
    } catch (err) {
      logger.error(`[${batchId}] Gemini classification failed: ${err}`);
      const missedIds = objects
        .filter((m) => {
          if (target === "experience") return miss.includes((m as ExperienceAttributes).title);
          else {
            const degree = (m as EducationAttributes).degrees || "";
            return miss.includes(`${degree}`);
          }
        })
        .map((m) => (m as any).id);
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
        logger.info(`we check if something here is saved ${JSON.stringify(hits[rawKey], null, 2)}}`)
      }
      await pipeline.exec();
    } catch (err) {
      logger.error(`[${batchId}] Failed to write to Redis: ${err}`);
    }
  

    logger.info(`space \n\n `)

  // Update objects in database
  for (const obj of objects) {
    let standardized: EducationAiOutput | ExperienceAiOutput, id: number;
    if (target === "experience") {
      standardized = hits[(obj as ExperienceAttributes).title] as ExperienceAiOutput;
      id = (obj as ExperienceAttributes).id;
      if (!standardized) continue;
      if ((obj as any).title_standerlization_status === "standardized") {
        logger.info(`[${batchId}] Skipping already-standardized obj: ${id}`);
        continue;
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
      // Education
      const degree = (obj as EducationAttributes).degrees || "";
      const rawKey = `${degree}`;
      standardized = hits[rawKey] as EducationAiOutput;
      logger.info(`${rawKey} used to generate ${JSON.stringify(standardized)}`)

      id = (obj as EducationAttributes).id;
      if (!standardized) continue;
      if ((obj as any).education_standardize_status === "standardized") {
        logger.info(`[${batchId}] Skipping already-standardized obj: ${id}`);
        continue;
      }
      try {
        logger.info(`${JSON.stringify(standardized)},----------------------- ,${Number(id)}`)
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
