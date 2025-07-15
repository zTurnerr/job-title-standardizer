import { config } from "../config";
import { fork } from "child_process";
import path from "path";
import {logger} from "../utils/logger";

const numWorkers = config.numTemporalWorkers;

for (let i = 0; i < numWorkers; i++) {
  const workerPath = path.resolve(__dirname, "./singleWorker.ts");
  const child = fork(workerPath, [i.toString()]);

  child.on("exit", (code) => {
    logger.info(`Worker process ${child.pid} exited with code ${code}`);
  });

  child.on("error", (err) => {
    logger.error(`Worker process ${child.pid} error:`, err);
  });
}
