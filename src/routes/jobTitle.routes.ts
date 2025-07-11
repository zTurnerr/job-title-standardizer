import express, { RequestHandler } from "express";
import { validateJobTitleArray } from "../middlewares/validation.middleware";
import { standardizeJobTitleHandler } from "../controllers/jobTitle.controller";
import { checkCache } from "../middlewares/cache.middleware";

const router = express.Router();

router.post(
  "/standardize",
  // validateJobTitleArray as unknown as RequestHandler,
  // checkCache(process.env.CACHE_KEY as string) as unknown as RequestHandler,
  standardizeJobTitleHandler
);

export default router;
