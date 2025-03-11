import { ApiError } from "../middleware/error-handler";
import { OpportunitySchema } from "./schemas";
import { ZodError } from "zod";

/**
 * Service for validating grant opportunity data.
 * Provides methods for validating complete and partial opportunity objects,
 * as well as search queries.
 */
export class ValidationService {
  /**
   * Validates a complete opportunity object against the schema.
   * @param data - The opportunity data to validate
   * @throws {ApiError} If validation fails with a 400 status code
   */
  static validateOpportunity(data: unknown): void {
    try {
      OpportunitySchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiError(400, `Invalid opportunity data: ${error.message}`);
      }
      throw error;
    }
  }
  /**
   * Validates a partial opportunity object for updates.
   * Allows undefined fields while validating present fields against the schema.
   * @param data - The partial opportunity data to validate
   * @throws {ApiError} If validation fails with a 400 status code
   */
  static validatePartialOpportunity(data: unknown): void {
    try {
      OpportunitySchema.partial().parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiError(400, `Invalid opportunity data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validates a search query string.
   * Ensures the query is a non-empty string within length limits.
   * @param query - The search query to validate
   * @throws {ApiError} If validation fails with a 400 status code
   */
  static validateSearchQuery(query: unknown): void {
    if (typeof query !== "string") {
      throw new ApiError(400, "Search query must be a string");
    }
    if (query.trim().length === 0) {
      throw new ApiError(400, "Search query cannot be empty");
    }
    if (query.length > 100) {
      throw new ApiError(400, "Search query is too long (max 100 characters)");
    }
  }
}
