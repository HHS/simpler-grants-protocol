import { Request, Response, NextFunction } from "express";
import { ValidationService } from "../services/validation.service";
import { ApiError } from "../errors/api-error";
import { ZodError } from "zod";

const handleValidationError = (error: unknown) => {
  if (error instanceof ZodError) {
    const message = error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new ApiError(400, `Validation error: ${message}`);
  }
  throw error;
};

export const validateGrantBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ValidationService.validateGrant(req.body);
    next();
  } catch (error) {
    next(handleValidationError(error));
  }
};

export const validatePartialGrantBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ValidationService.validatePartialGrant(req.body);
    next();
  } catch (error) {
    next(handleValidationError(error));
  }
};
