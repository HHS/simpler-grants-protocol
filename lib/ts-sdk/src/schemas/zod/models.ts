import { z } from "zod";
import { EventSchema, MoneySchema, CustomFieldSchema, SystemMetadataSchema } from "./fields";
import {
  StringArrayFilterSchema,
  DateRangeFilterSchema,
  MoneyRangeFilterSchema,
  DefaultFilterSchema,
} from "./filters";
import { UuidSchema } from "./types";

// ############################################################################
// Status models
// ############################################################################

export const OppStatusOptionsEnum = z.enum(["forecasted", "open", "closed", "custom"]);

export const OppStatusSchema = z.object({
  /** The status value */
  value: OppStatusOptionsEnum,

  /** A custom status value */
  customValue: z.string().nullish(),

  /** A human-readable description of the status */
  description: z.string().nullish(),
});

// ############################################################################
// Applicant type models
// ############################################################################

export const ApplicantTypeOptionsEnum = z.enum([
  "individual",
  "organization",
  "government_state",
  "government_county",
  "government_municipal",
  "government_special_district",
  "government_tribal",
  "organization_tribal_other",
  "school_district_independent",
  "higher_education_public",
  "higher_education_private",
  "non_profit_with_501c3",
  "nonprofit_without_501c3",
  "for_profit_small_business",
  "for_profit_not_small_business",
  "unrestricted",
  "custom",
]);

export const ApplicantTypeSchema = z
  .object({
    /** The type of applicant */
    value: ApplicantTypeOptionsEnum,

    /** The custom value for the applicant type */
    customValue: z.string().nullish(),

    /** The description of the applicant type */
    description: z.string().nullish(),
  })
  .strict();

// ############################################################################
// Funding models
// ############################################################################

export const OppFundingSchema = z
  .object({
    /** Details about the funding available for this opportunity that don't fit other fields */
    details: z.string().nullish(),

    /** Total amount of funding available */
    totalAmountAvailable: MoneySchema.nullish(),

    /** Minimum amount of funding granted per award */
    minAwardAmount: MoneySchema.nullish(),

    /** Maximum amount of funding granted per award */
    maxAwardAmount: MoneySchema.nullish(),

    /** Minimum number of awards granted */
    minAwardCount: z.number().int().nullish(),

    /** Maximum number of awards granted */
    maxAwardCount: z.number().int().nullish(),

    /** Estimated number of awards that will be granted */
    estimatedAwardCount: z.number().int().nullish(),
  })
  .strict();

// ############################################################################
// Timeline models
// ############################################################################

export const OppTimelineSchema = z
  .object({
    /** The date (and time) at which the opportunity is posted */
    postDate: EventSchema.nullish(),

    /** The date (and time) at which the opportunity closes */
    closeDate: EventSchema.nullish(),

    /** An optional map of other key dates or events in the opportunity timeline */
    otherDates: z.record(EventSchema).nullish(),
  })
  .strict();

// ############################################################################
// Base Opportunity model
// ############################################################################

export const OpportunityBaseSchema = z
  .object({
    /** Globally unique id for the Opportunity */
    id: UuidSchema,

    /** Title or name of the funding Opportunity */
    title: z.string(),

    /** Status of the Opportunity */
    status: OppStatusSchema,

    /** Description of the Opportunity's purpose and scope */
    description: z.string(),

    /** Details about the funding available */
    funding: OppFundingSchema.nullish(),

    /** Key dates for the Opportunity */
    keyDates: OppTimelineSchema.nullish(),

    /** The type of applicant for the opportunity */
    acceptedApplicantTypes: z.array(ApplicantTypeSchema).nullish(),

    /** URL for the original source of the Opportunity */
    source: z.string().url().nullish(),

    /** Additional custom fields specific to this Opportunity */
    customFields: z.record(CustomFieldSchema).nullish(),
  })
  .merge(SystemMetadataSchema);

// ############################################################################
// Search models
// ############################################################################

export const OppSortByEnum = z.enum([
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

export const OppSortingSchema = z.object({
  /** The field to sort by */
  sortBy: OppSortByEnum,

  /** Implementation-defined sort key */
  customSortBy: z.string().nullish(),

  /** The direction to sort in */
  sortOrder: z.enum(["asc", "desc"]).nullish(),
});

export const OppDefaultFiltersSchema = z.object({
  /** Status filter */
  status: StringArrayFilterSchema.nullish(),

  /** Close date range filter */
  closeDateRange: DateRangeFilterSchema.nullish(),

  /** Total funding available range filter */
  totalFundingAvailableRange: MoneyRangeFilterSchema.nullish(),

  /** Min award amount range filter */
  minAwardAmountRange: MoneyRangeFilterSchema.nullish(),

  /** Max award amount range filter */
  maxAwardAmountRange: MoneyRangeFilterSchema.nullish(),
});

export const OppFiltersSchema = OppDefaultFiltersSchema.extend({
  /** Additional implementation-defined filters */
  customFilters: z.record(DefaultFilterSchema).nullish(),
});
