import { z } from "zod";
import { opportunityBaseSchema, oppSortingSchema } from "./models";
import { PaginationInfoSchema } from "./pagination";
import { oppDefaultFiltersSchema } from "./models";

// ############################################################################
// Base response schema
// ############################################################################

/** Response for a default operation */
export const defaultResponseSchema = z.object({
  /** The message */
  message: z.string(),
});

export type DefaultResponse = z.infer<typeof defaultResponseSchema>;

// ############################################################################
// Opportunity response schemas
// ############################################################################

/** A paginated list of opportunities */
export const opportunitiesListResponseSchema = defaultResponseSchema.extend({
  /** The list of opportunities */
  items: z.array(opportunityBaseSchema),
  /** The pagination details */
  paginationInfo: PaginationInfoSchema,
});

export type OpportunitiesListResponse = z.infer<typeof opportunitiesListResponseSchema>;

/** A paginated list of results from an opportunity search */
export const opportunitiesSearchResponseSchema = opportunitiesListResponseSchema.extend({
  /** The sorting details */
  sortInfo: oppSortingSchema,
  /** The filter details */
  filterInfo: oppDefaultFiltersSchema,
});

export type OpportunitiesSearchResponse = z.infer<typeof opportunitiesSearchResponseSchema>;

/** A single opportunity */
export const opportunityResponseSchema = defaultResponseSchema.extend({
  /** The opportunity */
  data: opportunityBaseSchema,
});

export type OpportunityResponse = z.infer<typeof opportunityResponseSchema>;
