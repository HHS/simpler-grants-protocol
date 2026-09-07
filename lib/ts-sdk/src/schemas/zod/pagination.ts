/**
 * Pagination schemas for the CommonGrants API.
 *
 * These schemas define pagination parameters and result information.
 * Query and body parameters share the same shape — consolidated into a single
 * PaginatedParamsSchema to avoid duplication (#1130).
 *
 * @packageDocumentation
 */

import { z } from "zod";

// ############################################################################
// Shared Params (query + body)
// ############################################################################

/** Pagination parameters (used for both query and body) */
export const PaginatedParamsSchema = z.object({
  /** The page to return */
  page: z.number().int().min(1).nullish().default(1),

  /** The number of items to return per page */
  pageSize: z.number().int().min(1).nullish().default(100),
});

/** Query parameters for paginated routes (alias for backwards compat) */
export const PaginatedQueryParamsSchema = PaginatedParamsSchema;

/** Body parameters for paginated routes (alias for backwards compat) */
export const PaginatedBodyParamsSchema = PaginatedParamsSchema;

// ############################################################################
// Results Info
// ############################################################################

/** Details about the paginated results */
export const PaginatedResultsInfoSchema = z.object({
  /** Current page number (indexing starts at 1) */
  page: z.number().int().min(1),

  /** Number of items per page (0 when the page is empty) */
  pageSize: z.number().int().min(0),

  /** Total number of items across all pages */
  totalItems: z.number().int().nullish(),

  /** Total number of pages */
  totalPages: z.number().int().nullish(),
});
