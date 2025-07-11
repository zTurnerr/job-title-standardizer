import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { memberQueueName } from '../queues/memberQueue';
import { sequelize } from '../utils/sequelize';
import dotenv from 'dotenv';
dotenv.config();

const numWorkers = Number(process.env.NUM_WORKERS) || 1;

console.log(`Starting ${numWorkers} workers...`);


const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,  
});
for (let i = 0; i < numWorkers; i++) {

const worker = new Worker(
  memberQueueName, 
  async (job: Job) => {
    console.log(`Processing Job ID: ${job.id} with worker ${i + 1}, first member ID: ${job.data[0]?.id}, title: ${job.data[0]?.title}, name: ${job.data[0]?.name}`);
    // console.log('Members in Batch:', job.data);
    const members = job.data;  // Array of members

    for (const member of members) {
      // Simulate your OpenAI title standardization:
    //   const standardizedTitle = await openaiClient.classifyJobTitle(member.title);

      // ✅ Update the member in DB:
      await sequelize.query(
        `UPDATE public.member SET title_standerlization_status = :status, outdated = TRUE WHERE id = :id`,
        {
          replacements: { id: member.id, status: "standardized" },
        }
      );
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
});
}