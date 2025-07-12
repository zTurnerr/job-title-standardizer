import { Connection, WorkflowClient } from '@temporalio/client';
import { enqueueMemberBatchesWithTemporal } from '../queues/enqueueMemeberBatches';

(async () => {
  console.log(`Enqueuer Worker Process Started (PID: ${process.pid})`);

  const connection = await Connection.connect();
  const client = new WorkflowClient({ connection });

  await enqueueMemberBatchesWithTemporal(client);  

  console.log(`Enqueuer Worker Process Completed (PID: ${process.pid})`);
  process.exit(0);
})();
