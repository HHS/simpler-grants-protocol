/**
 * Sorting schemas for the CommonGrants API.
 *
 * These schemas define sorting parameters and result information.
 * Query and body parameters share the same shape — consolidated into a single
 * SortParamsSchema to avoid duplication (#1130).
 *
 * @packageDocumentation
 */

import { z } from "zod";

// ############################################################################
// Sort Order Enum
// ############################################################################

/** Sort order enum */
export const SortOrderEnum = z.enum(["asc", "desc"]);

// ############################################################################
// Shared Params (query + body)
// ############################################################################

/** Sorting parameters (used for both query and body) */
export const SortParamsSchema = z.object({
  /** The field to sort by */
  sortBy: z.unknown(),

  /** Implementation-defined sort key */
  customSortBy: z.string().nullish(),

  /** The order to sort by */
  sortOrder: SortOrderEnum.nullish(),
});

/** Query parameters for sorting (alias for backwards compat) */
export const SortQueryParamsSchema = SortParamsSchema;

/** Body parameters for sorting (alias for backwards compat) */
export const SortBodyParamsSchema = SortParamsSchema;

// ############################################################################
// Results Info
// ############################################################################

/** Information about the sort order of the items returned */
export const SortedResultsInfoSchema = z.object({
  /** The field results are sorted by, or "custom" if an implementation-defined sort key is used */
  sortBy: z.string(),

  /** Implementation-defined sort key used to sort the results, if applicable */
  customSortBy: z.string().nullish(),

  /** The order in which the results are sorted, e.g. ascending or descending */
  sortOrder: SortOrderEnum,

  /** Non-fatal errors that occurred during sorting */
  errors: z.array(z.string()).nullish(),
});
