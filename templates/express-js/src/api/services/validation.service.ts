import { ApiError } from "../middleware/error-handler";
import { z } from "zod";
import {
  opportunityBaseSchema,
  oppDefaultFiltersSchema,
  oppSortingSchema,
} from "../schemas/models";
import { PaginatedQueryParamsSchema } from "../schemas/pagination";

/**
 * Service for validating API request data.
 * Provides methods for validating opportunities, search parameters, and pagination.
 */
export class ValidationService {
  /**
   * Validates a complete opportunity object against the schema.
   * @param data - The opportunity data to validate
   * @throws {ApiError} If validation fails
   */
  static validateOpportunity(data: unknown): void {
    try {
      opportunityBaseSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          400,
          `Invalid opportunity data: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      throw error;
    }
  }

  /**
   * Validates search parameters including filters, sorting, and pagination
   * @param filters - The filter criteria
   * @param sorting - The sort criteria
   * @param pagination - The pagination parameters
   * @throws {ApiError} If validation fails
   */
  static validateSearchParams(filters: unknown, sorting: unknown, pagination: unknown): void {
    try {
      oppDefaultFiltersSchema.parse(filters);
      oppSortingSchema.parse(sorting);
      PaginatedQueryParamsSchema.parse(pagination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          400,
          `Invalid search parameters: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      throw error;
    }
  }

  /**
   * Validates pagination parameters
   * @param params - The pagination parameters to validate
   * @throws {ApiError} If validation fails
   */
  static validatePagination(params: unknown): void {
    try {
      PaginatedQueryParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          400,
          `Invalid pagination parameters: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      throw error;
    }
  }
}
