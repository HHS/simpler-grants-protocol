import { z } from "zod";
import {
  eventSchema,
  moneySchema,
  customFieldSchema,
  systemMetadataSchema,
} from "./fields";
import {
  stringArrayFilterSchema,
  dateRangeFilterSchema,
  moneyRangeFilterSchema,
  defaultFilterSchema,
} from "./filters";

// ############################################################################
// Status models
// ############################################################################

export const oppStatusOptionsEnum = z.enum([
  "forecasted",
  "open",
  "closed",
  "custom",
]);

export type OppStatusOptions = z.infer<typeof oppStatusOptionsEnum>;

export const oppStatusSchema = z.object({
  /** The status value */
  value: oppStatusOptionsEnum,

  /** A custom status value */
  customValue: z.string().optional(),

  /** A human-readable description of the status */
  description: z.string().optional(),
});

export type OppStatus = z.infer<typeof oppStatusSchema>;

// ############################################################################
// Funding models
// ############################################################################

export const oppFundingSchema = z.object({
  /** Total amount of funding available */
  totalAmountAvailable: moneySchema.optional(),

  /** Minimum amount of funding granted per award */
  minAwardAmount: moneySchema.optional(),

  /** Maximum amount of funding granted per award */
  maxAwardAmount: moneySchema.optional(),

  /** Minimum number of awards granted */
  minAwardCount: z.number().int().optional(),

  /** Maximum number of awards granted */
  maxAwardCount: z.number().int().optional(),

  /** Estimated number of awards that will be granted */
  estimatedAwardCount: z.number().int().optional(),
});

export type OppFunding = z.infer<typeof oppFundingSchema>;

// ############################################################################
// Timeline models
// ############################################################################

export const oppTimelineSchema = z.object({
  /** The date (and time) at which the opportunity begins accepting applications */
  appOpens: eventSchema.optional(),

  /** The final deadline for submitting applications */
  appDeadline: eventSchema.optional(),

  /** An optional map of other key dates in the opportunity timeline */
  otherDates: z.record(eventSchema).optional(),
});

export type OppTimeline = z.infer<typeof oppTimelineSchema>;

// ############################################################################
// Base opportunity model
// ############################################################################

export const opportunityBaseSchema = z
  .object({
    /** Globally unique id for the opportunity */
    id: z.string().uuid(),

    /** Title or name of the funding opportunity */
    title: z.string(),

    /** Status of the opportunity */
    status: oppStatusSchema,

    /** Description of the opportunity's purpose and scope */
    description: z.string(),

    /** Details about the funding available */
    funding: oppFundingSchema,

    /** Key dates for the opportunity */
    keyDates: oppTimelineSchema,

    /** URL for the original source of the opportunity */
    source: z.string().url().optional(),

    /** Additional custom fields specific to this opportunity */
    customFields: z.record(customFieldSchema).optional(),
  })
  .merge(systemMetadataSchema);

export type OpportunityBase = z.infer<typeof opportunityBaseSchema>;

// ############################################################################
// Search models
// ############################################################################

export const oppSortByEnum = z.enum([
  "lastModifiedAt",
  "createdAt",
  "title",
  "status.value",
  "keyDates.closeDate",
  "funding.maxAwardAmount",
  "funding.minAwardAmount",
  "funding.totalAmountAvailable",
  "funding.estimatedAwardCount",
  "custom",
]);

export type OppSortBy = z.infer<typeof oppSortByEnum>;

export const oppSortingSchema = z.object({
  /** The field to sort by */
  sortBy: oppSortByEnum,

  /** The direction to sort in */
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type OppSorting = z.infer<typeof oppSortingSchema>;

export const oppDefaultFiltersSchema = z.object({
  /** Status filter */
  status: stringArrayFilterSchema.optional(),

  /** Close date range filter */
  closeDateRange: dateRangeFilterSchema.optional(),

  /** Total funding available range filter */
  totalFundingAvailableRange: moneyRangeFilterSchema.optional(),

  /** Min award amount range filter */
  minAwardAmountRange: moneyRangeFilterSchema.optional(),

  /** Max award amount range filter */
  maxAwardAmountRange: moneyRangeFilterSchema.optional(),
});

export type OppDefaultFilters = z.infer<typeof oppDefaultFiltersSchema>;

export const oppFiltersSchema = oppDefaultFiltersSchema.extend({
  /** Additional implementation-defined filters */
  customFilters: z.record(defaultFilterSchema).optional(),
});

export type OppFilters = z.infer<typeof oppFiltersSchema>;
