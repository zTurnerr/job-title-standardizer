import { Connection, WorkflowClient } from "@temporalio/client";
import { enqueueMemberBatchesWithTemporal } from "../queues/enqueueMemeberBatches";
import {logger} from "../utils/logger";

(async () => {
  logger.info(`Enqueuer Worker Process Started (PID: ${process.pid})`);

  const connection = await Connection.connect();
  const client = new WorkflowClient({ connection });

  await enqueueMemberBatchesWithTemporal(client);

  logger.info(`Enqueuer Worker Process Completed (PID: ${process.pid})`);
  process.exit(0);
})();
