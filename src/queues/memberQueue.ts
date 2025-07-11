import { Queue } from 'bullmq';
import redis from '../utils/ioredis';

export const memberQueue = new Queue('member-standardization', { connection: redis });

export const memberQueueName = 'member-standardization';