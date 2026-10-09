/**
 * CommonGrants TypeScript Types
 *
 * This module exports all TypeScript types inferred from the Zod schemas.
 * Import types from "@common-grants/sdk/types" for type annotations.
 *
 * @module @common-grants/sdk/types
 * @packageDocumentation
 */

import { z } from "zod";
import {
  // Fields
  EventSchema,
  SingleDateEventSchema,
  DateRangeEventSchema,
  OtherEventSchema,
  MoneySchema,
  CustomFieldSchema,
  SystemMetadataSchema,
  NameSchema,
  EventTypeEnum,
  CustomFieldTypeEnum,
  // Scalar types
  EmployerTaxIdSchema,
  SamUeiSchema,
  DunsSchema,
  // Identifiers
  IdentifierSchema,
  SystemIdSchema,
  IdentifierCollectionSchema,
  IdentifierStatusEnum,
  // References
  AppRefSchema,
  OrgIdEinSchema,
  OrgIdUeiSchema,
  OrgIdDunsSchema,
  OrgIdsSchema,
  OrgRefSchema,
  OrgRefCollectionSchema,
  OppIdFonSchema,
  OppIdAlnSchema,
  OppIdsSchema,
  OppRefSchema,
  // Filters
  DefaultFilterSchema,
  StringComparisonFilterSchema,
  StringArrayFilterSchema,
  NumberComparisonFilterSchema,
  NumberRangeFilterSchema,
  NumberArrayFilterSchema,
  DateComparisonFilterSchema,
  DateRangeFilterSchema,
  MoneyComparisonFilterSchema,
  MoneyRangeFilterSchema,
  EquivalenceOperatorsEnum,
  ComparisonOperatorsEnum,
  ArrayOperatorsEnum,
  StringOperatorsEnum,
  RangeOperatorsEnum,
  AllOperatorsEnum,
  // Models
  OppStatusSchema,
  ApplicantTypeSchema,
  OppFundingSchema,
  OppTimelineSchema,
  OpportunityBaseSchema,
  OppSortingSchema,
  OppDefaultFiltersSchema,
  OppFiltersSchema,
  OppStatusOptionsEnum,
  ApplicantTypeOptionsEnum,
  OppSortByEnum,
  // Responses
  SuccessSchema,
  ErrorSchema,
  // Pagination & Sorting
  PaginatedBodyParamsSchema,
  PaginatedResultsInfoSchema,
  SortedResultsInfoSchema,
} from "./schemas";

// ############################################################################
// Field types
// ############################################################################

export type Event = z.infer<typeof EventSchema>;
export type EventType = z.infer<typeof EventTypeEnum>;
export type SingleDateEvent = z.infer<typeof SingleDateEventSchema>;
export type DateRangeEvent = z.infer<typeof DateRangeEventSchema>;
export type OtherEvent = z.infer<typeof OtherEventSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type CustomField = z.infer<typeof CustomFieldSchema>;
export type CustomFieldType = z.infer<typeof CustomFieldTypeEnum>;
export type SystemMetadata = z.infer<typeof SystemMetadataSchema>;
export type Name = z.infer<typeof NameSchema>;

// ############################################################################
// Scalar types
// ############################################################################

export type EmployerTaxId = z.infer<typeof EmployerTaxIdSchema>;
export type SamUei = z.infer<typeof SamUeiSchema>;
export type Duns = z.infer<typeof DunsSchema>;

// ############################################################################
// Identifier types
// ############################################################################

export type Identifier = z.infer<typeof IdentifierSchema>;
export type SystemId = z.infer<typeof SystemIdSchema>;
export type IdentifierCollection = z.infer<typeof IdentifierCollectionSchema>;
export type IdentifierStatus = z.infer<typeof IdentifierStatusEnum>;
export type OrgIdEin = z.infer<typeof OrgIdEinSchema>;
export type OrgIdUei = z.infer<typeof OrgIdUeiSchema>;
export type OrgIdDuns = z.infer<typeof OrgIdDunsSchema>;
export type OrgIds = z.infer<typeof OrgIdsSchema>;
export type OppIdFon = z.infer<typeof OppIdFonSchema>;
export type OppIdAln = z.infer<typeof OppIdAlnSchema>;
export type OppIds = z.infer<typeof OppIdsSchema>;

// ############################################################################
// Reference types
// ############################################################################

export type AppRef = z.infer<typeof AppRefSchema>;
export type OrgRef = z.infer<typeof OrgRefSchema>;
export type OrgRefCollection = z.infer<typeof OrgRefCollectionSchema>;
export type OppRef = z.infer<typeof OppRefSchema>;

// ############################################################################
// Filter types
// ############################################################################

/** Filter operators */
export type EquivalenceOperator = z.infer<typeof EquivalenceOperatorsEnum>;
export type ComparisonOperator = z.infer<typeof ComparisonOperatorsEnum>;
export type ArrayOperator = z.infer<typeof ArrayOperatorsEnum>;
export type StringOperator = z.infer<typeof StringOperatorsEnum>;
export type RangeOperator = z.infer<typeof RangeOperatorsEnum>;
export type AllOperators = z.infer<typeof AllOperatorsEnum>;

/** Filters */
export type DefaultFilter = z.infer<typeof DefaultFilterSchema>;
export type StringComparisonFilter = z.infer<typeof StringComparisonFilterSchema>;
export type StringArrayFilter = z.infer<typeof StringArrayFilterSchema>;
export type NumberComparisonFilter = z.infer<typeof NumberComparisonFilterSchema>;
export type NumberRangeFilter = z.infer<typeof NumberRangeFilterSchema>;
export type NumberArrayFilter = z.infer<typeof NumberArrayFilterSchema>;
export type DateComparisonFilter = z.infer<typeof DateComparisonFilterSchema>;
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;
export type MoneyComparisonFilter = z.infer<typeof MoneyComparisonFilterSchema>;
export type MoneyRangeFilter = z.infer<typeof MoneyRangeFilterSchema>;

// ############################################################################
// Model types
// ############################################################################

export type OppStatus = z.infer<typeof OppStatusSchema>;
export type OppStatusOptions = z.infer<typeof OppStatusOptionsEnum>;
export type ApplicantType = z.infer<typeof ApplicantTypeSchema>;
export type ApplicantTypeOptions = z.infer<typeof ApplicantTypeOptionsEnum>;
export type OppFunding = z.infer<typeof OppFundingSchema>;
export type OppTimeline = z.infer<typeof OppTimelineSchema>;
export type OpportunityBase = z.infer<typeof OpportunityBaseSchema>;
export type OppSorting = z.infer<typeof OppSortingSchema>;
export type OppSortBy = z.infer<typeof OppSortByEnum>;
export type OppDefaultFilters = z.infer<typeof OppDefaultFiltersSchema>;
export type OppFilters = z.infer<typeof OppFiltersSchema>;
/** Input type for pagination body params (fields are optional before parsing) */
export type PaginatedBodyParams = z.input<typeof PaginatedBodyParamsSchema>;

// ############################################################################
// Response types
// ############################################################################

export type Success = z.infer<typeof SuccessSchema>;
export type ErrorResponse = z.infer<typeof ErrorSchema>;
export type PaginatedResultsInfo = z.infer<typeof PaginatedResultsInfoSchema>;
export type SortedResultsInfo = z.infer<typeof SortedResultsInfoSchema>;

/**
 * Generic OK response with data.
 * Use with specific data types, e.g., `Ok<OpportunityBase>`
 */
export type Ok<T> = Success & { data: T };

/**
 * Generic paginated response with items.
 * Use with specific item types, e.g., `Paginated<OpportunityBase>`
 */
export type Paginated<T> = Success & {
  items: T[];
  paginationInfo: PaginatedResultsInfo;
};

/**
 * Generic sorted response (paginated + sort info).
 * Use with specific item types, e.g., `Sorted<OpportunityBase>`
 */
export type Sorted<T> = Paginated<T> & {
  sortInfo: SortedResultsInfo;
};

/**
 * Generic filtered response (sorted + filter info).
 * Use with specific item and filter types.
 */
export type Filtered<T, F> = Sorted<T> & {
  filterInfo: {
    filters: F;
    errors?: string[] | null | undefined;
  };
};

// ############################################################################
// Opportunity-specific request and response types
// ############################################################################

export type OpportunityResponse = Ok<OpportunityBase>;
export type OpportunitiesListResponse = Paginated<OpportunityBase>;
export type OpportunitiesSortedResponse = Sorted<OpportunityBase>;
export type OpportunitiesFilteredResponse = Filtered<OpportunityBase, OppFilters>;
/** Request body for the search endpoint */
export interface OppSearchRequest {
  /** Text query to search opportunity titles and descriptions */
  search?: string;
  /** Filters to apply to the search */
  filters?: OppFilters;
  /** Sort order for results */
  sorting?: OppSorting;
  /** Pagination parameters */
  pagination?: PaginatedBodyParams;
}
