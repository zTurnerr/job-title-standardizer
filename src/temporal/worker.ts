import { Worker } from "@temporalio/worker";
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

// async function runWorker(Num: number) {
//   try {
//     logger.info(
//       `Starting Temporal Worker number ${Num} on task queue: ${taskQueue}`
//     );
//     const worker = await Worker.create({
//       workflowsPath: require.resolve("./workflows"),
//       activities: require("./activities"),
//       taskQueue: taskQueue,
//     });

//     logger.info(
//       `Temporal Worker started number ${Num} on task queue: ${taskQueue}`
//     );
//     await worker.run();
//   } catch (error) {
//     logger.error("Error starting Temporal Worker:", error);
//     process.exit(1);
//   }
// }

// (async () => {
//   for (let i = 0; i < numWorkers; i++) {
//     runWorker(i);
//   }
// })();
