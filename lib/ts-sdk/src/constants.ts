/**
 * CommonGrants Runtime Constants
 *
 * This module exports runtime constants for enum values.
 * Import constants from "@common-grants/sdk/constants" to avoid magic strings.
 *
 * @module @common-grants/sdk/constants
 * @packageDocumentation
 */

import {
  AwdStatusOptionsEnum,
  OppStatusOptionsEnum,
  ApplicantTypeOptionsEnum,
  OppSortByEnum,
  EventTypeEnum,
  CustomFieldTypeEnum,
  EquivalenceOperatorsEnum,
  ComparisonOperatorsEnum,
  ArrayOperatorsEnum,
  StringOperatorsEnum,
  RangeOperatorsEnum,
  AllOperatorsEnum,
  IdentifierStatusEnum,
} from "./schemas";

// ############################################################################
// Model enum constants
// ############################################################################

export const AwdStatusOptions: typeof AwdStatusOptionsEnum.enum = AwdStatusOptionsEnum.enum;
export const OppStatusOptions: typeof OppStatusOptionsEnum.enum = OppStatusOptionsEnum.enum;
export const ApplicantTypeOptions: typeof ApplicantTypeOptionsEnum.enum =
  ApplicantTypeOptionsEnum.enum;
export const OppSortBy: typeof OppSortByEnum.enum = OppSortByEnum.enum;

// ############################################################################
// Field enum constants
// ############################################################################

export const EventType: typeof EventTypeEnum.enum = EventTypeEnum.enum;
export const CustomFieldType: typeof CustomFieldTypeEnum.enum = CustomFieldTypeEnum.enum;

// ############################################################################
// Identifier enum constants
// ############################################################################

export const IdentifierStatus: typeof IdentifierStatusEnum.enum = IdentifierStatusEnum.enum;

// ############################################################################
// Filter operator enum constants
// ############################################################################

export const EquivalenceOperator: typeof EquivalenceOperatorsEnum.enum =
  EquivalenceOperatorsEnum.enum;
export const ComparisonOperator: typeof ComparisonOperatorsEnum.enum = ComparisonOperatorsEnum.enum;
export const ArrayOperator: typeof ArrayOperatorsEnum.enum = ArrayOperatorsEnum.enum;
export const StringOperator: typeof StringOperatorsEnum.enum = StringOperatorsEnum.enum;
export const RangeOperator: typeof RangeOperatorsEnum.enum = RangeOperatorsEnum.enum;
export const AllOperators: typeof AllOperatorsEnum.enum = AllOperatorsEnum.enum;
