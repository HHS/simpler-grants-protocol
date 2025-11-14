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
} from "./schemas";

// ############################################################################
// Model enum constants
// ############################################################################

export const OppStatusOptions = OppStatusOptionsEnum.enum;
export const ApplicantTypeOptions = ApplicantTypeOptionsEnum.enum;
export const OppSortBy = OppSortByEnum.enum;

// ############################################################################
// Field enum constants
// ############################################################################

export const EventType = EventTypeEnum.enum;
export const CustomFieldType = CustomFieldTypeEnum.enum;

// ############################################################################
// Filter operator enum constants
// ############################################################################

export const EquivalenceOperator = EquivalenceOperatorsEnum.enum;
export const ComparisonOperator = ComparisonOperatorsEnum.enum;
export const ArrayOperator = ArrayOperatorsEnum.enum;
export const StringOperator = StringOperatorsEnum.enum;
export const RangeOperator = RangeOperatorsEnum.enum;
export const AllOperators = AllOperatorsEnum.enum;
