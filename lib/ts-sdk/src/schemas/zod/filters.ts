/**
 * Zod schemas for the CommonGrants.Filters namespace in the @common-grants/core library
 *
 * @packageDocumentation
 */
import { z } from "zod";
import { MoneySchema } from "./fields";

// ############################################################################
// Filter operators
// ############################################################################

export const EquivalenceOperatorsEnum = z.enum(["eq", "neq"]);
export const ComparisonOperatorsEnum = z.enum(["gt", "gte", "lt", "lte"]);
export const ArrayOperatorsEnum = z.enum(["in", "notIn"]);
export const StringOperatorsEnum = z.enum(["like", "notLike"]);
export const RangeOperatorsEnum = z.enum(["between", "outside"]);
export const AllOperatorsEnum = z.enum([
  ...EquivalenceOperatorsEnum.options,
  ...ComparisonOperatorsEnum.options,
  ...ArrayOperatorsEnum.options,
  ...StringOperatorsEnum.options,
  ...RangeOperatorsEnum.options,
] as [string, ...string[]]);

// ############################################################################
// Base filter
// ############################################################################

export const DefaultFilterSchema = z.object({
  operator: AllOperatorsEnum,
  value: z.unknown(),
});

// ############################################################################
// String filters
// ############################################################################

export const StringComparisonFilterSchema = z.object({
  operator: z.union([EquivalenceOperatorsEnum, StringOperatorsEnum]),
  value: z.string(),
});

export const StringArrayFilterSchema = z.object({
  operator: ArrayOperatorsEnum,
  value: z.array(z.string()),
});

// ############################################################################
// Number filters
// ############################################################################

export const NumberComparisonFilterSchema = z.object({
  operator: z.union([ComparisonOperatorsEnum, EquivalenceOperatorsEnum]),
  value: z.number(),
});

export const NumberRangeFilterSchema = z.object({
  operator: RangeOperatorsEnum,
  value: z.object({
    min: z.number(),
    max: z.number(),
  }),
});

export const NumberArrayFilterSchema = z.object({
  operator: ArrayOperatorsEnum,
  value: z.array(z.number()),
});

// ############################################################################
// Date filters
// ############################################################################

const dateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  z.string().datetime(), // UTC or offset datetime
]);

export const DateComparisonFilterSchema = z.object({
  operator: ComparisonOperatorsEnum,
  value: dateSchema,
});

export const DateRangeFilterSchema = z.object({
  operator: RangeOperatorsEnum,
  value: z.object({
    min: dateSchema,
    max: dateSchema,
  }),
});

// ############################################################################
// Money filters
// ############################################################################

export const MoneyComparisonFilterSchema = z.object({
  operator: ComparisonOperatorsEnum,
  value: MoneySchema,
});

export const MoneyRangeFilterSchema = z.object({
  operator: RangeOperatorsEnum,
  value: z.object({
    min: MoneySchema,
    max: MoneySchema,
  }),
});
