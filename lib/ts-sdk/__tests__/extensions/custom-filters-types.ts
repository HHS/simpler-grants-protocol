/**
 * Compile-time type-narrowing assertions for the custom-filters `as const` surface.
 *
 * Checked by `tsc --noEmit` only (`pnpm --filter @common-grants/sdk run check:types`)
 * — there is no runtime test. Each `@ts-expect-error` directive IS the assertion:
 * it guards a line that actually fails to compile when `as const` narrowing is in
 * effect. If the narrowing ever regresses, the guarded line compiles, the directive
 * becomes unused (ts2578), and the type-check gate fails.
 */

import { definePlugin, type CustomFilterSpec, type PluginRoutes } from "@/extensions";

// ############################################################################
// Typed narrowing utilities
// ############################################################################

/** Compile-time mirror of `MoneySchema` — `amount` is a decimal STRING, not a number. */
type Money = { amount: string; currency: string };

/**
 * Maps each `CustomFilterType` literal to its typed `{operator, value}` filter shape.
 *
 * Compile-time mirror of the Zod schemas in `src/schemas/zod/filters.ts` (via
 * FILTER_TYPE_SCHEMAS in `custom-filters.ts`) — each row is directly comparable
 * to its runtime schema.
 */
interface FilterTypeMap {
  stringComparison: { operator: "eq" | "neq" | "like" | "notLike"; value: string };
  stringArray: { operator: "in" | "notIn"; value: string[] };
  numberComparison: { operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: number };
  numberArray: { operator: "in" | "notIn"; value: number[] };
  numberRange: { operator: "between" | "outside"; value: { min: number; max: number } };
  // TS has no integer type — the spec defines no integer filter model, so the
  // value is a plain number at runtime too (NumberComparisonFilterSchema)
  integerComparison: { operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: number };
  booleanComparison: { operator: "eq" | "neq"; value: boolean };
  dateComparison: { operator: "gt" | "gte" | "lt" | "lte"; value: string };
  dateRange: { operator: "between" | "outside"; value: { min: string; max: string } };
  moneyComparison: { operator: "gt" | "gte" | "lt" | "lte"; value: Money };
  moneyRange: { operator: "between" | "outside"; value: { min: Money; max: Money } };
}

/**
 * Typed `{operator, value}` pair for a single `CustomFilterSpec`.
 *
 * The indexed access doubles as a completeness guard: it fails to compile
 * (ts2536) if `FilterTypeMap` is missing or misnames any `CustomFilterType` key.
 */
type TypedFilter<TSpec extends CustomFilterSpec> = FilterTypeMap[TSpec["filterType"]];

/**
 * Narrows a `PluginRoutes` constant to the `filters` record for a specific
 * route + method. Returns `never` when the `filterType` values widened to
 * `string` (i.e. the plugin was NOT defined `as const`).
 */
type RouteFilterSpecs<
  TRoutes extends PluginRoutes,
  R extends keyof TRoutes & string,
  M extends keyof TRoutes[R] & string,
> = TRoutes[R][M] extends { filters: infer F }
  ? F extends Record<string, CustomFilterSpec>
    ? F
    : never
  : never;

/**
 * Maps each registered filter key to its `TypedFilter` shape. Keys NOT in
 * `TSpecs` are compile errors — the mapped type has no index signature.
 */
type TypedConsumerFilters<TSpecs extends Record<string, CustomFilterSpec>> = {
  [K in keyof TSpecs]?: TypedFilter<TSpecs[K]>;
};

// ############################################################################
// Plugin under test — defined WITH `as const`, the load-bearing form that
// preserves literal `filterType` values for per-key narrowing.
// ############################################################################

const grantsGovPlugin = definePlugin({
  meta: { name: "grants.gov", version: "0.1.0", sourceSystem: "grants.gov" },
  routes: {
    opportunities: {
      search: {
        filters: {
          agency: { filterType: "stringArray", description: "Filter by funding agency code" },
          fundingProgram: {
            filterType: "stringComparison",
            description: "Filter by funding program name",
          },
          awardCount: {
            filterType: "numberComparison",
            description: "Filter by number of awards",
          },
          awardFloor: {
            filterType: "moneyComparison",
            description: "Filter by minimum award amount",
          },
        },
      },
    },
  },
} as const);

// `grantsGovPlugin` is consumed only via `typeof` in GrantsGovSpecs below.
void grantsGovPlugin;

// The narrowed filter-specs record that TypedConsumerFilters maps over.
type GrantsGovSpecs = RouteFilterSpecs<
  NonNullable<typeof grantsGovPlugin.routes>,
  "opportunities",
  "search"
>;

// ############################################################################
// The six compile-error assertions
// ############################################################################

// (1) Unknown filter key — TypedConsumerFilters<GrantsGovSpecs> has only the
// registered keys; there is no index signature for anything else.
const unknownKey: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- unknown key 'notARealFilter' is not a registered filter (ts2353)
  notARealFilter: { operator: "eq", value: "x" },
};

// (2) Operator/filterType mismatch — awardCount is numberComparison
// ("eq" | "neq" | "gt" | "gte" | "lt" | "lte"); "like" is a string operator.
const wrongOperator: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- "like" is a string operator, not valid for numberComparison (ts2322)
  awardCount: { operator: "like", value: 5 },
};

// (3) Value-shape mismatch — numberComparison value must be a number.
const wrongValueShape: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- awardCount is numberComparison; value must be number, not string (ts2322)
  awardCount: { operator: "eq", value: "notANumber" },
};

// (4) Array-value-shape mismatch — stringArray value must be string[].
const scalarForArray: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- agency is stringArray; value must be string[], not a scalar string (ts2322)
  agency: { operator: "in", value: "HHS" },
};

// (5) Range operator on a comparison filter — moneyComparison allows only
// "gt" | "gte" | "lt" | "lte" (MoneyComparisonFilterSchema uses ComparisonOperatorsEnum).
const rangeOnComparison: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- "between" is a range operator, not valid for moneyComparison (ts2322)
  awardFloor: { operator: "between", value: { amount: "100000.00", currency: "USD" } },
};

// (6) Money.amount as a number — MoneySchema.amount is a decimal STRING
// (DecimalStringSchema).
const numericMoneyAmount: TypedConsumerFilters<GrantsGovSpecs> = {
  // @ts-expect-error -- Money.amount is a decimal string, not a number (ts2322)
  awardFloor: { operator: "gt", value: { amount: 100000, currency: "USD" } },
};

// The consts exist only to host the assertions above.
void [
  unknownKey,
  wrongOperator,
  wrongValueShape,
  scalarForArray,
  rangeOnComparison,
  numericMoneyAmount,
];
