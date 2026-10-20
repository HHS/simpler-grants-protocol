/**
 * Sorting schemas for the CommonGrants API.
 *
 * These schemas define sorting query parameters, body parameters, and result information.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { nullishAsOptional } from "./nullish.js";

// ############################################################################
// Sort Order Enum
// ############################################################################

/** Sort order enum */
export const SortOrderEnum = z.enum(["asc", "desc"]);

// ############################################################################
// Query Parameters
// ############################################################################

/** Query parameters for sorting */
export const SortQueryParamsSchema = z.object({
  /** The field to sort by */
  sortBy: z.unknown(),

  /** Implementation-defined sort key */
  customSortBy: nullishAsOptional(z.string()),

  /** The order to sort by */
  sortOrder: nullishAsOptional(SortOrderEnum),
});

// ############################################################################
// Body Parameters
// ############################################################################

/** Sorting parameters included in the request body */
export const SortBodyParamsSchema = z.object({
  /** The field to sort by */
  sortBy: z.unknown(),

  /** Implementation-defined sort key */
  customSortBy: nullishAsOptional(z.string()),

  /** The order to sort by */
  sortOrder: nullishAsOptional(SortOrderEnum),
});

// ############################################################################
// Results Info
// ############################################################################

/** Information about the sort order of the items returned */
export const SortedResultsInfoSchema = z.object({
  /** The field results are sorted by, or "custom" if an implementation-defined sort key is used */
  sortBy: z.string(),

  /** Implementation-defined sort key used to sort the results, if applicable */
  customSortBy: nullishAsOptional(z.string()),

  /** The order in which the results are sorted, e.g. ascending or descending */
  sortOrder: SortOrderEnum,

  /** Non-fatal errors that occurred during sorting */
  errors: nullishAsOptional(z.array(z.string())),
});
