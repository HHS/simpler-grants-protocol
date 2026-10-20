/**
 * Zod schemas for CommonGrants award route requests and responses.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { AwardBaseSchema, AwdFiltersSchema, AwdSortingSchema } from "./awards.js";
import { SuccessSchema } from "./responses.js";
import { SortOrderEnum } from "./sorting.js";
import { UuidSchema } from "./types.js";

const INT32_MAX = 2_147_483_647;

const RoutePaginationInputSchema = z
  .object({
    /** The page to return. */
    page: z.number().int().min(1).max(INT32_MAX).default(1),

    /** The number of items to return per page. */
    pageSize: z.number().int().min(1).max(INT32_MAX).default(100),
  })
  .strict();

const AwardSuccessSchema = SuccessSchema.extend({
  status: z.literal(200),
}).strict();

const AwardPaginationInfoSchema = z
  .object({
    /** Current page number. */
    page: z.number().int().min(1).max(INT32_MAX),

    /** Number of items on the current page. */
    pageSize: z.number().int().min(1),

    /** Total number of matching items. */
    totalItems: z.number().int().optional(),

    /** Total number of result pages. */
    totalPages: z.number().int().optional(),
  })
  .strict();

const AwardSortInfoSchema = z
  .object({
    /** Field used to sort the returned items. */
    sortBy: z.string(),

    /** Implementation-defined sort key, when used. */
    customSortBy: z.string().optional(),

    /** Direction in which the returned items are sorted. */
    sortOrder: SortOrderEnum,

    /** Non-fatal errors encountered while sorting. */
    errors: z.array(z.string()).optional(),
  })
  .strict();

/** Query parameters accepted by `GET /awards/`. */
export const AwardsListRequestSchema = RoutePaginationInputSchema;

/** Path parameters accepted by `GET /awards/{awdId}`. */
export const AwardGetRequestSchema = z
  .object({
    /** The award identifier from the request path. */
    awdId: UuidSchema,
  })
  .strict();

/** Request body accepted by `POST /awards/search`. */
export const AwdSearchRequestSchema = z
  .object({
    /** Text query applied to award titles and descriptions. */
    search: z.string().optional(),

    /** Filters applied to the award search. */
    filters: AwdFiltersSchema.optional(),

    /** Sort instructions for the award search. */
    sorting: AwdSortingSchema.optional(),

    /** Pagination instructions for the award search. */
    pagination: RoutePaginationInputSchema.optional(),
  })
  .strict();

/** Successful response from `GET /awards/{awdId}`. */
export const AwardResponseSchema = AwardSuccessSchema.extend({
  data: AwardBaseSchema,
}).strict();

/** Successful response from `GET /awards/`. */
export const AwardsListResponseSchema = AwardSuccessSchema.extend({
  items: z.array(AwardBaseSchema),
  paginationInfo: AwardPaginationInfoSchema,
}).strict();

/** Paginated award response that also reports sort metadata. */
export const AwardsSortedResponseSchema = AwardsListResponseSchema.extend({
  sortInfo: AwardSortInfoSchema,
}).strict();

/** Successful response from `POST /awards/search`. */
export const AwardsFilteredResponseSchema = AwardsSortedResponseSchema.extend({
  filterInfo: z
    .object({
      /** Filters applied to the returned awards. */
      filters: AwdFiltersSchema,

      /** Non-fatal errors encountered while filtering. */
      errors: z.array(z.string()).optional(),
    })
    .strict(),
}).strict();
