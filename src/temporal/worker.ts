import { Worker } from "@temporalio/worker";
import { config } from "../config";

const numWorkers = config.numTemporalWorkers
const taskQueue = config.taskQueue

async function runWorker(Num: number) {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities: require("./activities"),
    taskQueue: taskQueue,
  });

  console.log(`Temporal Worker started number ${Num} on task queue: ${taskQueue}`);
  await worker.run();
}

(async () => {
  for (let i = 0; i < numWorkers; i++) {
    runWorker(i); 
  }
})();
