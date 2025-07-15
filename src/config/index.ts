import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  pgHost: process.env.PG_HOST || "localhost",
  pgPort: Number(process.env.PG_PORT) || 5432,
  pgUser: process.env.PG_USER || "postgres",
  pgPassword: process.env.PG_PASSWORD || "postgres",
  pgDatabase: process.env.PG_DATABASE || "postgres",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  numBatches: Number(process.env.NUM_BATCHES) || 1,
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  numTemporalWorkers: Number(process.env.NUM_TEMPORAL_WORKERS) || 1,
  numEnqueuers: Number(process.env.NUM_ENQUEUERS) || 1,
  taskQueue: process.env.TASK_QUEUE || "MEMBER_STANDARDIZATION",
  cacheKey: process.env.CACHE_KEY || "TITLE_CACHE",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
