import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

export const validateJobTitleArray = [
  body("titles")
    .isArray({ min: 1 })
    .withMessage("'titles' must be a non-empty array of strings"),
  body("titles.*")
    .isString()
    .trim()
    // .isLength({ min: 2, max: 300 })
    .withMessage("Each job title must be a string between 2 and 100 characters")
    .escape(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
