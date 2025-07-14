import { Member, MemberAttributes } from "../models/Member";
import redis from "../utils/ioredis";
import { openaiClient } from "../utils/openaiClient.deprecated";
import { geminiClient } from "../utils/geminiClient";
import { JobTitle } from "../models/openaiJobTitle";
import { config } from "../config";
import { logger } from "../utils/logger";
import { normalizeJobTitle } from "../utils/titleNormalizer";
export async function standardizeMember(members: MemberAttributes[]) {
  /* steps:
  1. take the elements to redis to check if they are found there or not
  2. if found, return the standardized title => store in hits
  3. if not found => store in miss
  4. miss sent to send to OpenAI for classification 
  5. store the standardized title in redis + update member table in postgres status and other columns
  */

  if (members.length === 0) {
    logger.warn("No members to standardize.");
    return;
  }

  const cacheKeyPrefix = config.cacheKey;
  const hits: Record<string, JobTitle> = {};
  const miss: string[] = [];
  const failedMemberIds: number[] = [];
  const titleToNormalized: Record<string, string> = {};

  for (const member of members) {
    const normalized = normalizeJobTitle(member.title).normalized;
    titleToNormalized[member.title] = normalized;

    const cacheKey = `${cacheKeyPrefix}:${normalized}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // logger.info(`Cache hit for "${member.title}", Normalized: "${normalized}"`);
        hits[member.title] = JSON.parse(cached);
      } else {
        // logger.info(`Cache miss for "${member.title}", Normalized: "${normalized}"`);
        miss.push(member.title);
      }
    } catch (err) {
      logger.error(`Redis error for ${member.title}/${normalized}:`, err);
      failedMemberIds.push(member.id);
    }
  }
  logger.info(
    `Cache check complete. Hits: ${Object.keys(hits).length}, Misses: ${
      miss.length
    }`
  );
  let standardizedMiss: JobTitle[] = [];
  if (miss.length > 0) {
    try {
      standardizedMiss = await geminiClient.classifyJobTitles(miss);
    } catch (err) {
      logger.error("OpenAI classification failed:", err);
      const missedIds = members
        .filter((m) => miss.includes(m.title))
        .map((m) => m.id);
      failedMemberIds.push(...missedIds);
    }
  }

  try {
    const pipeline = redis.pipeline();
    for (const result of standardizedMiss) {
      const normalized = titleToNormalized[result.title];
      if (!normalized) continue;

      const key = `${cacheKeyPrefix}:${normalized}`;
      pipeline.set(key, JSON.stringify(result));
      hits[result.title] = result;
    }
    await pipeline.exec();
  } catch (err) {
    logger.error("Failed to write to Redis:", err);
  }

  for (const member of members) {
    const standardized = hits[member.title];
    if (!standardized) {
      // logger.warn(`No standardization result for "${member.title}"`);
      continue;
    }

    if (member.title_standerlization_status === "standardized") {
      logger.info(`Skipping already-standardized member: ${member.id}`);
      continue;
    }

    try {
      await Member.update(
        {
          title_standerlization_status: "standardized",
          standardized_title: standardized.title,
          department: standardized.department,
          function: Array.isArray(standardized.function)
            ? standardized.function
            : [standardized.function],
          seniority: standardized.seniority_level,
        },
        { where: { id: member.id } }
      );
    } catch (err) {
      logger.error(` DB update failed for member ID ${member.id}:`, err);
    }
  }

  if (failedMemberIds.length > 0) {
    try {
      await Member.update(
        { title_standerlization_status: "failed" },
        { where: { id: failedMemberIds } }
      );
      logger.warn(
        `Marked ${failedMemberIds.length} members as 'failed with ${members.length} total input for the worker'`
      );
    } catch (err) {
      logger.error("Failed to update 'failed' statuses:", err);
    }
  }

  // logger.info("After Update: ", standardizedMiss);
  logger.info("Standardization completed for batch.");
}
