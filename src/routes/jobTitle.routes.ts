import express, { RequestHandler } from "express";
import { standardizeExperienceAiOutputHandler, maualStandrizedExperienceAiOutput } from "../controllers/jobTitle.controller";
import { validateExperienceAiOutputArray } from "../middlewares/validation.middleware";

const router = express.Router();

router.post("/initStandardizeProcess", standardizeExperienceAiOutputHandler);

router.post(
  "/maualBatchStandardize",
  validateExperienceAiOutputArray as unknown as RequestHandler,
  maualStandrizedExperienceAiOutput
);

export default router;
