import { z } from "zod";
import { moneySchema } from "./fields";

// ############################################################################
// Filter operators
// ############################################################################

export const equivalenceOperatorsEnum = z.enum(["eq", "neq"]);
export type EquivalenceOperators = z.infer<typeof equivalenceOperatorsEnum>;

export const comparisonOperatorsEnum = z.enum(["gt", "gte", "lt", "lte"]);
export type ComparisonOperators = z.infer<typeof comparisonOperatorsEnum>;

export const arrayOperatorsEnum = z.enum(["in", "not_in"]);
export type ArrayOperators = z.infer<typeof arrayOperatorsEnum>;

export const stringOperatorsEnum = z.enum(["like", "not_like"]);
export type StringOperators = z.infer<typeof stringOperatorsEnum>;

export const rangeOperatorsEnum = z.enum(["between", "outside"]);
export type RangeOperators = z.infer<typeof rangeOperatorsEnum>;

export const allOperatorsEnum = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "like",
  "not_like",
  "between",
  "outside",
]);
export type AllOperators = z.infer<typeof allOperatorsEnum>;

// ############################################################################
// Base filter
// ############################################################################

export const defaultFilterSchema = z.object({
  operator: allOperatorsEnum,
  value: z.unknown(),
});

export type DefaultFilter = z.infer<typeof defaultFilterSchema>;

// ############################################################################
// String filters
// ############################################################################

export const stringComparisonFilterSchema = z.object({
  operator: z.union([equivalenceOperatorsEnum, stringOperatorsEnum]),
  value: z.string(),
});

export type StringComparisonFilter = z.infer<typeof stringComparisonFilterSchema>;

export const stringArrayFilterSchema = z.object({
  operator: arrayOperatorsEnum,
  value: z.array(z.string()),
});

export type StringArrayFilter = z.infer<typeof stringArrayFilterSchema>;

// ############################################################################
// Number filters
// ############################################################################

export const numberComparisonFilterSchema = z.object({
  operator: comparisonOperatorsEnum,
  value: z.number(),
});

export type NumberComparisonFilter = z.infer<typeof numberComparisonFilterSchema>;

export const numberRangeFilterSchema = z.object({
  operator: rangeOperatorsEnum,
  value: z.object({
    min: z.number(),
    max: z.number(),
  }),
});

export type NumberRangeFilter = z.infer<typeof numberRangeFilterSchema>;

export const numberArrayFilterSchema = z.object({
  operator: arrayOperatorsEnum,
  value: z.array(z.number()),
});

export type NumberArrayFilter = z.infer<typeof numberArrayFilterSchema>;

// ############################################################################
// Date filters
// ############################################################################

const dateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  z.string().datetime(), // UTC or offset datetime
]);

export const dateComparisonFilterSchema = z.object({
  operator: comparisonOperatorsEnum,
  value: dateSchema,
});

export type DateComparisonFilter = z.infer<typeof dateComparisonFilterSchema>;

export const dateRangeFilterSchema = z.object({
  operator: rangeOperatorsEnum,
  value: z.object({
    min: dateSchema,
    max: dateSchema,
  }),
});

export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;

// ############################################################################
// Money filters
// ############################################################################

export const moneyComparisonFilterSchema = z.object({
  operator: comparisonOperatorsEnum,
  value: moneySchema,
});

export type MoneyComparisonFilter = z.infer<typeof moneyComparisonFilterSchema>;

export const moneyRangeFilterSchema = z.object({
  operator: rangeOperatorsEnum,
  value: z.object({
    min: moneySchema,
    max: moneySchema,
  }),
});

export type MoneyRangeFilter = z.infer<typeof moneyRangeFilterSchema>;
