// src/queues/enqueueWorker.ts
import { enqueueMemberBatches } from '../queues/enqueueMemeberBatches';

(async () => {

  console.log(`Enqueuer Worker Process Started (PID: ${process.pid})`);

  await enqueueMemberBatches();

  console.log(`Enqueuer Worker Process Completed (PID: ${process.pid})`);
  
  process.exit(0);
})();
