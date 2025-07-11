import { Request, Response, NextFunction } from 'express';
import redis from '../utils/ioredis';

export const checkCache = (keyPrefix: string) => async (req: Request, res: Response, next: NextFunction) => {
  const jobTitles: string[] = req.body.titles;

  if (!Array.isArray(jobTitles)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of strings under "titles".' });
  }

  const keys = jobTitles.map(title => `${keyPrefix}:${title}`);
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.get(key));
  const results = await pipeline.exec();
  const hits: Record<string, string> = {};
  const miss: string[] = [];

  results?.forEach(([err, value], index) => {
    const title = jobTitles[index];
    if (err || value === null) {
      miss.push(title);
    } else {
      hits[title] = value as string;
    }
  });

  res.locals.hits = hits;
  res.locals.miss = miss;
  res.locals.cacheKeyPrefix = keyPrefix;

  next();
};
