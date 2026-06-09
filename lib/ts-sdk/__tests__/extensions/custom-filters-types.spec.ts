/**
 * Compile-time type-narrowing tests for the custom-filters `as const` surface.
 *
 * This file's primary purpose is to COMPILE. Passing `tsc --noEmit` (via
 * `pnpm check:types`) IS the assertion — every `@ts-expect-error` directive
 * guards a line that ACTUALLY fails to compile when `as const` is in effect.
 * Removing any directive would surface an unused-directive error (ts2578) and
 * fail the type-check gate.
 *
 * Run with: `pnpm --filter @common-grants/sdk test custom-filters-types`
 * Type-check: `pnpm --filter @common-grants/sdk run check:types`
 */

import { describe, expect, it } from "vitest";
import { definePlugin, type CustomFilterSpec, type Plugin, type PluginRoutes } from "@/extensions";

// ############################################################################
// Typed narrowing utilities
// ############################################################################

/** Compile-time mirror of `MoneySchema` — `amount` is a decimal STRING, not a number. */
type Money = { amount: string; currency: string };

/**
 * Maps each `CustomFilterType` literal to its typed `{operator, value}` filter shape.
 *
 * Single lookup table mirroring the Zod schemas in `src/schemas/zod/filters.ts`
 * (via FILTER_TYPE_SCHEMAS in `custom-filters.ts`). These are the *compile-time*
 * equivalents used here for narrowing assertions — the runtime schemas enforce
 * the same constraints. One table (rather than separate operator/value
 * conditional chains) keeps each row directly comparable to its schema.
 */
interface FilterTypeMap {
  stringComparison: { operator: "eq" | "neq" | "like" | "notLike"; value: string };
  stringArray: { operator: "in" | "notIn"; value: string[] };
  numberComparison: { operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: number };
  numberArray: { operator: "in" | "notIn"; value: number[] };
  numberRange: { operator: "between" | "outside"; value: { min: number; max: number } };
  // TS has no integer type — int constraint is runtime-only (IntegerComparisonFilterSchema)
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
 * This is the COMPILE-TIME representation of the request-body filter object.
 * It narrows both the operator (to only those valid for the filterType)
 * and the value (to the shape expected by the filterType's Zod schema).
 *
 * The indexed access doubles as a completeness guard: it fails to compile
 * (ts2536) if `FilterTypeMap` is missing or misnames any `CustomFilterType` key.
 */
type TypedFilter<TSpec extends CustomFilterSpec> = FilterTypeMap[TSpec["filterType"]];

/**
 * Narrows a `PluginRoutes` constant to the `filters` record for a specific
 * route + method.
 *
 * Returns `Record<string, CustomFilterSpec>` (typed) when `TRoutes` carries
 * literal `filterType` values (i.e. the plugin was defined `as const`).
 * Returns `never` when the filterType values widened to `string` (no `as const`).
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
 * Maps each registered filter key to its `TypedFilter` shape.
 *
 * Keys NOT in `TSpecs` are compile errors when this type is used as a parameter
 * constraint — the mapped type provides no index signature for unknown keys.
 *
 * For the full call site (mixing typed + default + ad-hoc), callers intersect
 * with `& Record<string, unknown>` for the unregistered portion. The typed
 * portion still enforces operator/value for REGISTERED keys.
 */
export type TypedConsumerFilters<TSpecs extends Record<string, CustomFilterSpec>> = {
  [K in keyof TSpecs]?: TypedFilter<TSpecs[K]>;
};

/**
 * Resolves the filters parameter type for `buildTypedFilters`.
 *
 * - WITH `as const`: `TSpecs` resolves to the literal filter-spec record →
 *   `TypedConsumerFilters<TSpecs>` narrows keys, operators, and value shapes.
 * - WITHOUT `as const`: `TSpecs` resolves to `never` (filterType widened to
 *   `string`, failing the `CustomFilterSpec` constraint) →
 *   falls back to `Record<string, unknown>`, accepting any object without
 *   type-checking keys or value shapes (the named widening trap).
 */
type FilterParams<TSpecs> = [TSpecs] extends [never]
  ? Record<string, unknown>
  : TSpecs extends Record<string, CustomFilterSpec>
    ? TypedConsumerFilters<TSpecs>
    : Record<string, unknown>;

/**
 * A thin typed filter-builder: accepts only filters that conform to the plugin's
 * registered filter specs for a given route + method. Returns them unchanged
 * (identity function). The compile-time narrowing happens at the call site.
 *
 * The typed surface intentionally does NOT include default filters (status,
 * closeDateRange, etc.) or ad-hoc keys — those stay outside the narrowed
 * record. This function is exercised in the @ts-expect-error tests below.
 */
function buildTypedFilters<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TPlugin extends { routes?: PluginRoutes; schemas: any },
  R extends keyof NonNullable<TPlugin["routes"]> & string,
  M extends keyof NonNullable<TPlugin["routes"]>[R] & string,
>(
  _plugin: TPlugin,
  _resource: R,
  _method: M,
  filters: FilterParams<RouteFilterSpecs<NonNullable<TPlugin["routes"]>, R, M>>
): typeof filters {
  return filters;
}

// ############################################################################
// WITH `as const` — the six @ts-expect-error compile-error assertions
// ############################################################################

// Define the plugin under test WITH `as const` — the load-bearing form.
// The `as const` assertion preserves the literal filterType values so that
// TypeScript can narrow the TypedFilter<TSpec> type per filter key.
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

// `grantsGovPlugin` is consumed only via `typeof` in the GrantsGovSpecs type below;
// this reference marks it as intentionally used so it is not flagged as an unused value.
void grantsGovPlugin;

// Extract the spec type for use in @ts-expect-error assertions.
// This is the narrowed filter-specs record that TypedConsumerFilters maps over.
type GrantsGovSpecs = RouteFilterSpecs<
  NonNullable<typeof grantsGovPlugin.routes>,
  "opportunities",
  "search"
>;

describe("custom-filters compile-time narrowing (as const)", () => {
  it("type tests compile", () => {
    // The real assertion is `tsc --noEmit` exit 0. This trivial Vitest assertion
    // exists solely so Vitest registers the file as a test suite.
    expect(true).toBe(true);
  });

  // #### (1) Unknown filter key is a compile error WITH `as const` ####
  //
  // `TypedConsumerFilters<GrantsGovSpecs>` has only agency | fundingProgram | awardCount.
  // An unknown key triggers: "Object literal may only specify known properties" (ts2353).
  it("unknown filter key is a compile error (asserted with @ts-expect-error)", () => {
    const bad: TypedConsumerFilters<GrantsGovSpecs> = {
      // @ts-expect-error -- unknown key 'notARealFilter' is not a registered filter (ts2353)
      notARealFilter: { operator: "eq", value: "x" },
    };
    void bad;
    expect(true).toBe(true);
  });

  // #### (2) Operator/filterType mismatch is a compile error WITH `as const` ####
  //
  // `awardCount` is a `numberComparison` filter — allowed operators are
  // `"eq" | "neq" | "gt" | "gte" | "lt" | "lte"`. The `like` operator is only
  // valid for `stringComparison`. TypeScript reports:
  // "Type '"like"' is not assignable to type '"eq" | "neq" | "gt" | "gte" | "lt" | "lte"'."
  it("operator/filterType mismatch is a compile error (asserted with @ts-expect-error)", () => {
    const bad: TypedConsumerFilters<GrantsGovSpecs> = {
      // @ts-expect-error -- "like" is a string operator, not valid for numberComparison (ts2322)
      awardCount: { operator: "like", value: 5 },
    };
    void bad;
    expect(true).toBe(true);
  });

  // #### (3) Value-shape mismatch (scalar string vs. number) is a compile error WITH `as const` ####
  //
  // `awardCount` is a `numberComparison` filter — value must be `number`.
  // Passing a `string` triggers: "Type 'string' is not assignable to type 'number'."
  it("value-shape mismatch (string where number required) is a compile error (asserted with @ts-expect-error)", () => {
    const bad: TypedConsumerFilters<GrantsGovSpecs> = {
      // @ts-expect-error -- awardCount is numberComparison; value must be number, not string (ts2322)
      awardCount: { operator: "eq", value: "notANumber" },
    };
    void bad;
    expect(true).toBe(true);
  });

  // #### (4) Array-value-shape mismatch (scalar where string[] required) is a compile error WITH `as const` ####
  //
  // `agency` is a `stringArray` filter — value must be `string[]`.
  // Passing a scalar string triggers: "Type 'string' is not assignable to type 'string[]'."
  it("array-value-shape mismatch (scalar where string[] required) is a compile error (asserted with @ts-expect-error)", () => {
    // @ts-expect-error -- agency is stringArray; value must be string[], not a scalar string (ts2322)
    const bad: TypedConsumerFilters<GrantsGovSpecs> = { agency: { operator: "in", value: "HHS" } };
    void bad;
    expect(true).toBe(true);
  });

  // #### (5) Range operator on a moneyComparison filter is a compile error WITH `as const` ####
  //
  // `awardFloor` is a `moneyComparison` filter — allowed operators are
  // `"gt" | "gte" | "lt" | "lte"` (MoneyComparisonFilterSchema uses
  // ComparisonOperatorsEnum only). `between` is a range operator.
  it("range operator on moneyComparison is a compile error (asserted with @ts-expect-error)", () => {
    const bad: TypedConsumerFilters<GrantsGovSpecs> = {
      // @ts-expect-error -- "between" is a range operator, not valid for moneyComparison (ts2322)
      awardFloor: { operator: "between", value: { amount: "100000.00", currency: "USD" } },
    };
    void bad;
    expect(true).toBe(true);
  });

  // #### (6) Money.amount as a number is a compile error WITH `as const` ####
  //
  // `MoneySchema.amount` is a decimal STRING (DecimalStringSchema), not a number.
  it("numeric Money.amount on moneyComparison is a compile error (asserted with @ts-expect-error)", () => {
    const bad: TypedConsumerFilters<GrantsGovSpecs> = {
      // @ts-expect-error -- Money.amount is a decimal string, not a number (ts2322)
      awardFloor: { operator: "gt", value: { amount: 100000, currency: "USD" } },
    };
    void bad;
    expect(true).toBe(true);
  });
});

// ############################################################################
// WITHOUT `as const` — the silent-widening trap
// ############################################################################

// Widening happens when the Plugin's routes type is stored as the broad
// `PluginRoutes` base (Record<string, ...>) rather than the literal const type.
// Explicitly annotating as `Plugin` (with no TRoutes generic) discards the
// literal filterType values and collapses the TypedConsumerFilters narrowing.
//
// RESULT: the previously-rejected unknown key, wrong operator, and wrong value
// type are now ACCEPTED without error — the typed guard is gone.
//
// NOTE: A lint rule (e.g. a custom `prefer-as-const` for `definePlugin` calls)
// would catch the missing `as const` at authoring time.

// Explicitly widen the plugin to `Plugin` (erases TRoutes literal type).
const widenedPlugin: Plugin = definePlugin({
  meta: { name: "grants.gov", version: "0.1.0", sourceSystem: "grants.gov" },
  routes: {
    opportunities: {
      search: {
        filters: {
          agency: { filterType: "stringArray" },
          fundingProgram: { filterType: "stringComparison" },
          awardCount: { filterType: "numberComparison" },
        },
      },
    },
  },
  // NOTE: Even with `as const` here, the `Plugin` annotation erases TRoutes.
  // This demonstrates the widening trap: if a plugin is stored, passed, or
  // returned as the unparameterized `Plugin` type, call-site narrowing is lost.
} as const);

describe("custom-filters WITHOUT as const — widening trap", () => {
  it("demonstrates widening: previously-rejected keys/values are accepted", () => {
    // All three lines below would be @ts-expect-error WITH the narrowed plugin type,
    // but they compile CLEAN here — because `Plugin` erases TRoutes to PluginRoutes
    // and `RouteFilterSpecs` returns `never`, so `FilterParams` falls back to
    // `Record<string, unknown>` (accepting any object).

    // Accepted: unknown key
    buildTypedFilters(widenedPlugin, "opportunities", "search", {
      notARealFilter: { operator: "eq", value: "silently accepted" },
    });

    // Accepted: wrong operator for numberComparison
    buildTypedFilters(widenedPlugin, "opportunities", "search", {
      awardCount: { operator: "like", value: 5 },
    });

    // Accepted: string where number expected
    buildTypedFilters(widenedPlugin, "opportunities", "search", {
      awardCount: { operator: "eq", value: "stringInsteadOfNumber" },
    });

    // The SAME calls compiled without errors; this Vitest assertion is a sentinel.
    expect(true).toBe(true);
  });
});
