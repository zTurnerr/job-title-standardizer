import { Worker } from "@temporalio/worker";
import { config } from "../config";
import { randomInt } from "crypto";
import { logger } from "../utils/logger";

const taskQueue = config.taskQueue;
const workerId = process.argv[2] || randomInt(1000, 9999).toString();

async function runWorker() {
  try {
    const worker = await Worker.create({
      workflowsPath: require.resolve("./workflows"),
      activities: require("./activities"),
      taskQueue,
    });

    logger.info(`Worker #${workerId} started on task queue "${taskQueue}"`);
    await worker.run();
  } catch (err) {
    logger.error(`Worker #${workerId} failed to start:`, err);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

runWorker();
