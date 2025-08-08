import { Request, Response } from "express";
import { standardizeExperienceAiOutputs, manualStandardizeExperienceAiOutputs } from "../services/jobTitle.service";
import { logger } from "../utils/logger";

export async function standardizeExperienceAiOutputHandler(req: Request, res: Response) {
  try {
    const jobTitles: string[] = req.body.titles;
    standardizeExperienceAiOutputs(req, res);
    res.json({
      message: "Job titles standardized successfully",
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function maualStandrizedExperienceAiOutput(req: Request, res: Response) {
  try {
    const jobTitles: string[] = req.body.titles;
    manualStandardizeExperienceAiOutputs(jobTitles);
    res.json({
      message: "Job titles standardized successfully",
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
