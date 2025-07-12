import express, { RequestHandler } from "express";
import { standardizeJobTitleHandler } from "../controllers/jobTitle.controller";

const router = express.Router();

router.post(
  "/standardize",
  standardizeJobTitleHandler
);

export default router;
