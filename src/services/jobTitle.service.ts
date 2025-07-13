import { Request, Response } from "express";
import { fork } from "child_process";
import path from "path";
import { config } from "../config";
import { logger } from "../utils/logger";

export async function standardizeJobTitles(req: Request, res: Response) {
  const numProcesses = config.numEnqueuers;

  logger.info(`Spawning ${numProcesses} enqueuer processes...`);

  for (let i = 0; i < numProcesses; i++) {
    const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");

    const worker = fork(workerPath);

    worker.on("exit", (code) => {
      logger.info(`Enqueuer process ${worker.pid} exited with code ${code}`);
    });
  }
}
