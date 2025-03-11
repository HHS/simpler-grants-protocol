import { Request, Response, NextFunction } from "express";
import { ValidationService } from "../services/validation.service";
import { ApiError } from "./error.middleware";
import { z } from "zod";

const handleValidationError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    const message = error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
    throw new ApiError(400, `Validation error: ${message}`);
  }
  throw error;
};

/**
 * Validates a complete opportunity object in the request body
 */
export const validateOpportunityBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    ValidationService.validateOpportunity(req.body);
    next();
  } catch (error) {
    next(handleValidationError(error));
  }
};

/**
 * Validates pagination parameters in the request query
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  try {
    ValidationService.validatePagination(req.query);
    next();
  } catch (error) {
    next(handleValidationError(error));
  }
};

/**
 * Validates search parameters in the request body
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction) => {
  try {
    ValidationService.validateSearchParams(req.body.filters, req.body.sorting, req.body.pagination);
    next();
  } catch (error) {
    next(handleValidationError(error));
  }
};
