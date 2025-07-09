import { openaiClient } from "../utils/openaiClient";
import redis from "../utils/ioredis";
import { Request, Response } from "express";

export async function standardizeJobTitles(req: Request, res: Response) {

  const hits = res.locals.hits as Record<string, string>;
  const miss = res.locals.miss as string[];
  const cacheKeyPrefix = res.locals.cacheKeyPrefix as string;

  console.log(hits, miss, cacheKeyPrefix);

  const standardized: Record<string, string> = { ...hits };
  if (miss.length > 0) {
  const standardizedMiss = await openaiClient.classifyJobTitles(miss);
  console.log("standardizedMiss", standardizedMiss);
  const pipeline = redis.pipeline();
  standardizedMiss.forEach(ele => {
    pipeline.set(`${cacheKeyPrefix}:${ele.title}`, JSON.stringify(ele), 'EX', 3600);
  });
  await pipeline.exec();
  Object.assign(standardized, standardizedMiss);
  }

}
