import { Connection, WorkflowClient } from "@temporalio/client";
import { enqueueMemberBatches } from "../queues/enqueueMemeberBatches";
import { logger } from "../utils/logger";

(async () => {
  const connection = await Connection.connect();
  const client = new WorkflowClient({ connection });

  process.on("message", async (message: any) => {
    const titles = message?.titles;

    try {
      if (Array.isArray(titles) && titles.length > 0) {
        logger.info(
          `Received ${titles.length} titles from parent. Enqueuing via payload.`
        );
        await enqueueMemberBatches(client, titles);
      } else {
        logger.info("No titles provided, falling back to DB batch mode.");
        await enqueueMemberBatches(client);
      }

      process.exit(0);
    } catch (err) {
      logger.error("EnqueueWorker failed:", err);
      process.exit(1);
    }
  });

  // If no message arrives in a short time, fallback automatically
  setTimeout(() => {
    logger.warn("No message received. Falling back to default DB enqueue.");
    process.send?.({ fallback: true });
  }, 2000);
})();
