/**
 * Pagination schemas for the CommonGrants API.
 *
 * These schemas define pagination query parameters, body parameters, and result information.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { nullishAsOptional, nullishWithDefault } from "./nullish.js";

// ############################################################################
// Query Parameters
// ############################################################################

/** Query parameters for paginated routes */
export const PaginatedQueryParamsSchema = z.object({
  /** The page to return */
  page: nullishWithDefault(z.number().int().min(1), 1),

  /** The number of items to return per page */
  pageSize: nullishWithDefault(z.number().int().min(1), 100),
});

// ############################################################################
// Body Parameters
// ############################################################################

/** Body parameters for paginated routes */
export const PaginatedBodyParamsSchema = z.object({
  /** The page to return */
  page: nullishWithDefault(z.number().int().min(1), 1),

  /** The number of items to return per page */
  pageSize: nullishWithDefault(z.number().int().min(1), 100),
});

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
  totalItems: nullishAsOptional(z.number().int()),

  /** Total number of pages */
  totalPages: nullishAsOptional(z.number().int()),
});
