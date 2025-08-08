import { Request, Response } from "express";
import { fork } from "child_process";
import path from "path";
import { config } from "../config";
import { logger } from "../utils/logger";

export async function standardizeExperienceAiOutputs(req: Request, res: Response) {
  const numProcesses = config.numEnqueuers;
  const titlesFromBody = req.body?.titles;

  logger.info(`Spawning ${numProcesses} enqueuer processes...`);

  for (let i = 0; i < numProcesses; i++) {
    const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");
    const worker = fork(workerPath, [], {
      execArgv: ["-r", "ts-node/register"],
    });

    worker.on("exit", (code) => {
      logger.info(`Enqueuer process ${worker.pid} exited with code ${code}`);
    });
    worker.on("message", (msg) => {
      if (msg) {
        logger.warn(
          `Worker ${worker.pid} defaulted to DB batch mode (no message received).`
        );
      }
    });

    if (Array.isArray(titlesFromBody) && titlesFromBody.length > 0) {
      logger.info(
        `Sending ${titlesFromBody.length} titles to worker ${worker.pid}`
      );
      worker.send({ titles: titlesFromBody });
    }
  }
}

export async function manualStandardizeExperienceAiOutputs(manualTitles: string[]) {
  const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");
  const worker = fork(workerPath, [], {
    execArgv: ["-r", "ts-node/register"],
  });

  worker.on("exit", (code) => {
    logger.info(`Enqueuer process ${worker.pid} exited with code ${code}`);
  });

  worker.send({ titles: manualTitles });
}
