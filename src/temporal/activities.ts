import { Member, MemberAttributes } from "../models/Member";
import redis from "../utils/ioredis";
import { openaiClient } from "../utils/openaiClient";
import { JobTitle } from "../models/openaiJobTitle";
import { config } from "../config";
import { logger } from "../utils/logger";
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

  for (const member of members) {
    const cacheKey = `${cacheKeyPrefix}:${member.title}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for "${member.title}"`);
        hits[member.title] = JSON.parse(cached);
      } else {
        logger.info(`Cache miss for "${member.title}"`);
        miss.push(member.title);
      }
    } catch (err) {
      logger.error(`Redis error for ${member.title}:`, err);
      failedMemberIds.push(member.id);
    }
  }

  let standardizedMiss: JobTitle[] = [];
  if (miss.length > 0) {
    try {
      standardizedMiss = await openaiClient.classifyJobTitles(miss);
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
      const key = `${cacheKeyPrefix}:${result.title}`;
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
      logger.warn(`No standardization result for "${member.title}"`);
      failedMemberIds.push(member.id);
      continue;
    }
    if (member.title_standerlization_status === "standardized") {
      logger.info(`Skipping already-standardized member: ${member.id}`);
      continue;
    }

    logger.info("Before Update Operation Log: ", standardized);
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
      failedMemberIds.push(member.id);
    }
  }

  if (failedMemberIds.length > 0) {
    try {
      await Member.update(
        { title_standerlization_status: "failed" },
        { where: { id: failedMemberIds } }
      );
      logger.warn(`Marked ${failedMemberIds.length} members as 'failed'`);
    } catch (err) {
      logger.error("Failed to update 'failed' statuses:", err);
    }
  }

  logger.info("After Update: ", standardizedMiss);
  logger.info("Standardization completed for batch.");
}
