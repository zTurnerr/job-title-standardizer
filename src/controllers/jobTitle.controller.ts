import { Request, Response } from "express";
import { standardizeJobTitles } from "../services/jobTitle.service";

export async function standardizeJobTitleHandler(req: Request, res: Response) {
  try {
    const jobTitles: string[] = req.body.titles;
    const result = await standardizeJobTitles(req, res);

    res.json({
      message: "Job titles standardized successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
