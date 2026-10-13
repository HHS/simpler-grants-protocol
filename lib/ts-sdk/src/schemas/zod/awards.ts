/**
 * Zod schemas for CommonGrants award models.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import {
  CustomFieldSchema,
  EventSchema,
  MoneySchema,
  NameSchema,
  SystemMetadataSchema,
} from "./fields.js";
import {
  DateRangeFilterSchema,
  DefaultFilterSchema,
  MoneyRangeFilterSchema,
  StringArrayFilterSchema,
} from "./filters.js";
import { createIdentifierSchema, IdentifierCollectionSchema } from "./identifiers.js";
import { AppRefSchema, OppRefSchema, OrgRefCollectionSchema } from "./references.js";
import { SortOrderEnum } from "./sorting.js";
import { UuidSchema } from "./types.js";

// ############################################################################
// Award status
// ############################################################################

/** Values accepted for an award's lifecycle status. */
export const AwdStatusOptionsEnum = z.enum(["awarded", "completed", "cancelled", "custom"]);

/** The lifecycle status of an award. */
export const AwdStatusSchema = z
  .object({
    /** The selected status value. */
    value: AwdStatusOptionsEnum,

    /** An implementation-defined value when `value` is `custom`. */
    customValue: z.string().optional(),

    /** A human-readable description of the status. */
    description: z.string().optional(),
  })
  .strict();

// ############################################################################
// Award funding and timeline
// ############################################################################

/** Financial details about an award. */
export const AwdFundingSchema = z
  .object({
    /** Funding details that do not fit another field. */
    details: z.string().optional(),

    /** Amount requested by the recipient. */
    requestedAmount: MoneySchema.optional(),

    /** Amount awarded to the recipient. */
    awardedAmount: MoneySchema.optional(),

    /** Amount disbursed to the recipient so far. */
    disbursedAmount: MoneySchema.optional(),
  })
  .strict();

/** Key dates in an award's timeline. */
export const AwdTimelineSchema = z
  .object({
    /** The date on which the award was issued. */
    awardDate: EventSchema.optional(),

    /** The period during which the funded work is expected to be performed. */
    periodOfPerformance: EventSchema.optional(),

    /** Other named dates or events in the award timeline. */
    otherDates: z.record(z.string(), EventSchema).optional(),
  })
  .strict();

// ############################################################################
// Award identifiers and references
// ############################################################################

/** An award's Federal Award Identification Number (FAIN). */
export const AwdIdFainSchema = createIdentifierSchema(z.string(), z.literal("awd:us:fain"));

/** Identifiers associated with an award. */
export const AwdIdsSchema = IdentifierCollectionSchema.extend({
  /** The award's Federal Award Identification Number. */
  "awd:us:fain": AwdIdFainSchema.optional(),
}).strict();

/** A compact reference to an award. */
export const AwdRefSchema = z
  .object({
    /** The award's unique identifier. */
    id: UuidSchema,

    /** The title or name of the award. */
    title: z.string(),

    /** System and registry-specific award identifiers. */
    identifiers: AwdIdsSchema.optional(),
  })
  .strict();

// ############################################################################
// Award recipient
// ############################################################################

/** An individual who received an award. */
export const AwdRecipientIndividualSchema = z
  .object({
    /** The individual's name. */
    name: NameSchema.optional(),

    /** Identifiers associated with the individual. */
    identifiers: IdentifierCollectionSchema.optional(),

    /** Implementation-defined fields about the individual recipient. */
    customFields: z.record(z.string(), CustomFieldSchema).optional(),
  })
  .strict();

// ############################################################################
// Base award
// ############################################################################

/** A grant award. */
export const AwardBaseSchema = z
  .object({
    /** The award's unique identifier. */
    id: UuidSchema,

    /** The title or name of the award. */
    title: z.string(),

    /** System and registry-specific award identifiers. */
    identifiers: AwdIdsSchema.optional(),

    /** Description of the award's purpose. */
    description: z.string(),

    /** The award's lifecycle status. */
    status: AwdStatusSchema,

    /** Requested, awarded, and disbursed amounts. */
    funding: AwdFundingSchema.optional(),

    /** Award date and period of performance. */
    keyDates: AwdTimelineSchema.optional(),

    /** The opportunity that resulted in the award. */
    opportunity: OppRefSchema.optional(),

    /** The application that resulted in the award. */
    application: AppRefSchema.optional(),

    /** Organizations that funded the award. */
    funders: OrgRefCollectionSchema.optional(),

    /** Organization recipients, when applicable. */
    recipientOrganizations: OrgRefCollectionSchema.optional(),

    /** The individual recipient, when applicable. */
    recipientIndividual: AwdRecipientIndividualSchema.optional(),

    /** Parent award for amendments or multi-tranche awards. */
    parent: AwdRefSchema.optional(),

    /** URL for the canonical source record. */
    source: z.url().optional(),
  })
  .extend(SystemMetadataSchema.shape)
  .strict();

// ############################################################################
// Award search filters
// ############################################################################

const AwardStringArrayFilterSchema = StringArrayFilterSchema.strict();
const AwardDateRangeFilterSchema = DateRangeFilterSchema.extend({
  value: DateRangeFilterSchema.shape.value.strict(),
}).strict();
const AwardMoneyRangeFilterSchema = MoneyRangeFilterSchema.extend({
  value: MoneyRangeFilterSchema.shape.value.strict(),
}).strict();
const AwardDefaultFilterSchema = DefaultFilterSchema.strict();

const awardNamedFilterShape = {
  /** Award statuses to include. */
  status: AwardStringArrayFilterSchema.optional(),

  /** Opportunity identifiers to include. */
  opportunityId: AwardStringArrayFilterSchema.optional(),

  /** Range of award dates to include. */
  awardDateRange: AwardDateRangeFilterSchema.optional(),

  /** Range of awarded amounts to include. */
  awardedAmountRange: AwardMoneyRangeFilterSchema.optional(),
};

/** Standard award filters, plus implementation-defined filters at the root. */
export const AwdDefaultFiltersSchema = z
  .object(awardNamedFilterShape)
  .catchall(AwardDefaultFilterSchema);

/** Filters accepted by the award search request. */
export const AwdFiltersSchema = z
  .object({
    ...awardNamedFilterShape,

    /** Additional implementation-defined filters. */
    customFilters: z.record(z.string(), AwardDefaultFilterSchema).optional(),
  })
  .strict();

// ############################################################################
// Award search sorting
// ############################################################################

/** Fields by which award search results can be sorted. */
export const AwdSortByEnum = z.enum([
  "lastModifiedAt",
  "createdAt",
  "title",
  "status.value",
  "keyDates.awardDate",
  "funding.awardedAmount",
  "custom",
]);

/** Sorting parameters for award searches. */
export const AwdSortingSchema = z
  .object({
    /** The field by which to sort results. */
    sortBy: AwdSortByEnum,

    /** Implementation-defined sort key. */
    customSortBy: z.string().optional(),

    /** Direction in which to sort results. */
    sortOrder: SortOrderEnum.optional(),
  })
  .strict();
