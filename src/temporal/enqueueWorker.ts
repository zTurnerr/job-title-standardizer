import { Connection, WorkflowClient } from "@temporalio/client";
import { enqueueMemberBatches } from "../queues/enqueueMemeberBatches";
import { logger } from "../utils/logger";
import { aiStandardizationTypes } from "../models/aiTypes";

const target = process.argv[2] || "experience" ; // default to 'experience' if not specified

// (async () => {
//   logger.info(`EnqueueWorker started for ${target}`);
//   const connection = await Connection.connect();
//   const client = new WorkflowClient({ connection });
//   logger.info("EnqueueWorker connected to Temporal");

//   process.on("message", async (message: any) => {
//     try {
//       logger.info(`No ${target} provided, falling back to DB batch mode.`);
//       await enqueueMemberBatches(client, target);

//       process.exit(0);
//     } catch (err) {
//       logger.error(`EnqueueWorker failed for ${target}:`, err);
//       process.exit(1);
//     }
//   });

//   // If no message arrives in a short time, fallback automatically
//   setTimeout(() => {
//     logger.warn("No message received. Falling back to default DB enqueue.");
//     process.send?.({ fallback: true });
//   }, 2000);
// })();

(async () => {
    logger.info(`EnqueueWorker started for ${target}`);
    const connection = await Connection.connect();
    const client = new WorkflowClient({ connection });
    logger.info("EnqueueWorker connected to Temporal");
  try {
    logger.info(`Starting DB batch enqueue for ${target}...`);
    await enqueueMemberBatches(client, target);
    logger.info(`Batch enqueue completed for ${target}.`);
    process.exit(0);
  } catch (err) {
    logger.error(`EnqueueWorker failed for ${target}:`, err);
    process.exit(1);
  }
})();