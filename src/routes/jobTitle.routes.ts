import express, { RequestHandler } from "express";
import { standardizeJobTitleHandler, maualStandrizedJobTitle } from "../controllers/jobTitle.controller";
import { validateJobTitleArray } from "../middlewares/validation.middleware";

const router = express.Router();

router.post("/initStandardizeProcess", standardizeJobTitleHandler);

router.post(
  "/maualBatchStandardize",
  validateJobTitleArray as unknown as RequestHandler,
  maualStandrizedJobTitle
);

export default router;
