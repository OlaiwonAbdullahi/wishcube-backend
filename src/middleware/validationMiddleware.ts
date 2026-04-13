import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../utils/errorHandler";

/**
 * Middleware to handle express-validator results
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors: string[] = [];
  errors.array().map((err) => extractedErrors.push(err.msg));

  return next(new AppError(extractedErrors[0], 400));
};
