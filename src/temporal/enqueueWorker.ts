import { Connection, WorkflowClient } from "@temporalio/client";
import { enqueueMemberBatches } from "../queues/enqueueMemeberBatches";
import { logger } from "../utils/logger";
import { aiStandardizationTypes } from "../models/aiTypes";

const target = process.argv[2] || "experience" ; // default to 'experience' if not specified


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