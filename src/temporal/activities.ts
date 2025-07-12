import { Member, MemberAttributes } from "../models/Member";
import redis from "../utils/ioredis";
import { openaiClient } from "../utils/openaiClient";
import { JobTitle } from "../models/openaiJobTitle";
import { config } from "../config";
export async function standardizeMember(members: MemberAttributes[]) {
  /* steps:
  1. take the elements to redis to check if they are found there or not
  2. if found, return the standardized title => store in hits
  3. if not found => store in miss
  4. miss sent to send to OpenAI for classification 
  5. store the standardized title in redis + update member table in postgres status and other columns
  */
  if (members.length === 0) {
    console.warn("No members to standardize.");
    return;
  }

  const cacheKeyPrefix = config.cacheKey;
  const hits: Record<string, JobTitle> = {};
  const miss: string[] = [];

  for (const member of members) {
    const cacheKey = `${cacheKeyPrefix}:${member.title}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`Cache hit for title "${member.title}"`);
      hits[member.title] = JSON.parse(cached);
    } else {
      console.log(`Cache miss for title "${member.title}"`);
      miss.push(member.title);
    }
  }

  let standardizedMiss: JobTitle[] = [];
  if (miss.length > 0) {
    standardizedMiss = await openaiClient.classifyJobTitles(miss);
  }

  const pipeline = redis.pipeline();

  for (const result of standardizedMiss) {
    const cacheKey = `${cacheKeyPrefix}:${result.title}`;
    pipeline.set(cacheKey, JSON.stringify(result));
    hits[result.title] = result;
  }

  await pipeline.exec();

  for (const member of members) {
    const standardized = hits[member.title];
    if (!standardized) {
      console.warn(`Missing standardized result for ${member.title}`);
      continue;
    }

    console.log("update operation log: ", standardized);
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
      {
        where: {
          title: member.title,
        },
      }
    );
  }

  console.log("After Update: ", standardizedMiss);
  console.log("Standardization completed for batch.");
}
