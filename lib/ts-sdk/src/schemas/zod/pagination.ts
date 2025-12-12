/**
 * Pagination schemas for the CommonGrants API.
 *
 * These schemas define pagination query parameters, body parameters, and result information.
 *
 * @packageDocumentation
 */

import { z } from "zod";

// ############################################################################
// Query Parameters
// ############################################################################

/** Query parameters for paginated routes */
export const PaginatedQueryParamsSchema = z.object({
  /** The page to return */
  page: z.number().int().min(1).nullish().default(1),

  /** The number of items to return per page */
  pageSize: z.number().int().min(1).nullish().default(100),
});

// ############################################################################
// Body Parameters
// ############################################################################

/** Body parameters for paginated routes */
export const PaginatedBodyParamsSchema = z.object({
  /** The page to return */
  page: z.number().int().min(1).nullish().default(1),

  /** The number of items to return per page */
  pageSize: z.number().int().min(1).nullish().default(100),
});

// ############################################################################
// Results Info
// ############################################################################

/** Details about the paginated results */
export const PaginatedResultsInfoSchema = z.object({
  /** Current page number (indexing starts at 1) */
  page: z.number().int().min(1),

  /** Number of items per page */
  pageSize: z.number().int().min(1),

  /** Total number of items across all pages */
  totalItems: z.number().int().nullish(),

  /** Total number of pages */
  totalPages: z.number().int().nullish(),
});
