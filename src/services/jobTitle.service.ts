import { openaiClient } from "../utils/openaiClient";
import redis from "../utils/ioredis";
import { Request, Response } from "express";
import { fork } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export async function standardizeJobTitles(req: Request, res: Response) {
  const numProcesses = Number(process.env.NUM_ENQUEUERS) || 2;

  console.log(`Spawning ${numProcesses} enqueuer processes...`);

  for (let i = 0; i < numProcesses; i++) {
    const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");

    const worker = fork(workerPath);

    worker.on("exit", (code) => {
      console.log(`Enqueuer process ${worker.pid} exited with code ${code}`);
    });
  }
}

// const hits = res.locals.hits as Record<string, string>;
// const miss = res.locals.miss as string[];
// const cacheKeyPrefix = res.locals.cacheKeyPrefix as string;

// console.log(hits, miss, cacheKeyPrefix);

// const standardized: Record<string, string> = { ...hits };
// if (miss.length > 0) {
// const standardizedMiss = await openaiClient.classifyJobTitles(miss);
// console.log("standardizedMiss", standardizedMiss);
// const pipeline = redis.pipeline();
// standardizedMiss.forEach(ele => {
//   pipeline.set(`${cacheKeyPrefix}:${ele.title}`, JSON.stringify(ele), 'EX', 3600);
// });
// await pipeline.exec();
// Object.assign(standardized, standardizedMiss);
// }
