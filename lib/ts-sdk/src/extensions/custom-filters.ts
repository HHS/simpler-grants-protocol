/**
 * Custom Filters Extension
 *
 * Provides the classifier, validators, and F helper namespace for the custom-filters surface.
 *
 * - `classifyFilters` — transforms a flat consumer `filters` object into the
 *   ADR-0012 `OppFilters` request body (three-bucket: default → named top-level fields;
 *   registered custom → `customFilters`; ad-hoc → `customFilters` passthrough),
 *   throwing `FilterError` on the first invalid value.
 * - `validateRoutes` — registration-time validation; rejects unknown `filterType`
 *   and custom names that collide with default-filter names.
 * - `validateFilterCall` — call-time validation; rejects operator/filterType mismatch
 *   and value-shape mismatches for registered filters; shape-only check for ad-hoc.
 * - `F` — helper namespace that compiles `{operator, value}` raw filter objects.
 *
 * Request-body contract: ADR-0012 / OppFiltersSchema.
 * Core-field escape hatch: `gov.<system>@<filterName>` keys pass through as custom-filter
 * keys verbatim.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import { DefaultFilterSchema } from "../schemas/zod/filters";
import {
  BooleanComparisonFilterSchema,
  DateComparisonFilterSchema,
  DateRangeFilterSchema,
  MoneyComparisonFilterSchema,
  MoneyRangeFilterSchema,
  NumberArrayFilterSchema,
  NumberComparisonFilterSchema,
  NumberRangeFilterSchema,
  StringArrayFilterSchema,
  StringComparisonFilterSchema,
} from "../schemas/zod/filters";
import { OppDefaultFiltersSchema, OppFiltersSchema } from "../schemas/zod/models";
import type {
  CustomFilterSpec,
  CustomFilterType,
  PluginRoutes,
  ResourceName,
  RouteDeclarations,
  RouteMethod,
} from "./types";
import { FilterError } from "./types";

// ############################################################################
// Public — filter-type schema map
// ############################################################################

/**
 * Maps each CustomFilterType to the Zod schema that validates its
 * `{operator, value}` pair. Each schema constrains both the allowed operator
 * enum and the value shape, so a single parse covers both checks.
 * Literal-typed (`as const`) so `CustomFilterInput` can project per-type inputs.
 */
export const FILTER_TYPE_SCHEMAS = {
  stringComparison: StringComparisonFilterSchema,
  stringArray: StringArrayFilterSchema,
  numberComparison: NumberComparisonFilterSchema,
  numberArray: NumberArrayFilterSchema,
  numberRange: NumberRangeFilterSchema,
  booleanComparison: BooleanComparisonFilterSchema,
  dateComparison: DateComparisonFilterSchema,
  dateRange: DateRangeFilterSchema,
  moneyComparison: MoneyComparisonFilterSchema,
  moneyRange: MoneyRangeFilterSchema,
} as const satisfies Record<CustomFilterType, z.ZodTypeAny>;

/** Input type accepted for a registered custom filter of the given filterType. */
export type CustomFilterInput<FT extends CustomFilterType> = z.input<
  (typeof FILTER_TYPE_SCHEMAS)[FT]
>;

/**
 * All 11 valid CustomFilterType values — used for unknown-filterType detection.
 */
const VALID_FILTER_TYPES = new Set<string>(Object.keys(FILTER_TYPE_SCHEMAS));

/**
 * The default-filter field names from `OppDefaultFiltersSchema`.
 * Custom filter names must not collide with these.
 */
const DEFAULT_FILTER_NAMES = new Set<string>(Object.keys(OppDefaultFiltersSchema.shape));

/**
 * `resource.method` routes whose custom filters this client classifies. A route
 * is filter-capable when its core operation declares a `filters` parameter
 * (lib/core routes); this set hardcodes that subset. As more routes gain filter
 * support, derive it from the contract rather than extending this literal by hand.
 */
const SUPPORTED_CUSTOM_FILTER_ROUTES = new Set<string>(["opportunities.search"]);

// ############################################################################
// Public — F helpers
// ############################################################################

/**
 * Helper namespace for building `{operator, value}` raw filter objects.
 *
 * Each helper compiles to the `DefaultFilter` wire shape accepted by ADR-0012.
 * Raw `{operator, value}` objects are also accepted by `classifyFilters` — F.*
 * is a convenience layer, not a requirement.
 *
 * NOTE: `F.in` uses the TS reserved word as an object key — valid as a property
 * key. The Python sibling uses `f.in_` to avoid the reserved-word restriction;
 * this cross-SDK naming difference is a documented divergence across SDKs.
 *
 * @example
 * ```typescript
 * const filter = F.eq("open");
 * // → { operator: "eq", value: "open" }
 *
 * const range = F.between(100, 500);
 * // → { operator: "between", value: { min: 100, max: 500 } }
 * ```
 */
export const F = {
  /** Equals — `{ operator: "eq", value }` */
  eq: <V>(value: V) => ({ operator: "eq" as const, value }),
  /** Not equals — `{ operator: "neq", value }` */
  neq: <V>(value: V) => ({ operator: "neq" as const, value }),
  /** Greater than — `{ operator: "gt", value }` */
  gt: <V>(value: V) => ({ operator: "gt" as const, value }),
  /** Greater than or equal — `{ operator: "gte", value }` */
  gte: <V>(value: V) => ({ operator: "gte" as const, value }),
  /** Less than — `{ operator: "lt", value }` */
  lt: <V>(value: V) => ({ operator: "lt" as const, value }),
  /** Less than or equal — `{ operator: "lte", value }` */
  lte: <V>(value: V) => ({ operator: "lte" as const, value }),
  /** Array inclusion — `{ operator: "in", value: [...] }` */
  in: <V>(value: V[]) => ({ operator: "in" as const, value }),
  /** Array exclusion — `{ operator: "notIn", value: [...] }` */
  notIn: <V>(value: V[]) => ({ operator: "notIn" as const, value }),
  /** String pattern match — `{ operator: "like", value }` */
  like: (value: string) => ({ operator: "like" as const, value }),
  /** String pattern non-match — `{ operator: "notLike", value }` */
  notLike: (value: string) => ({ operator: "notLike" as const, value }),
  /** Range (inclusive) — `{ operator: "between", value: { min, max } }` */
  between: <V>(min: V, max: V) => ({ operator: "between" as const, value: { min, max } }),
  /** Range (exclusive) — `{ operator: "outside", value: { min, max } }` */
  outside: <V>(min: V, max: V) => ({ operator: "outside" as const, value: { min, max } }),
};

// ############################################################################
// Public — validateRoutes (registration-time validation)
// ############################################################################

/**
 * Registration-time validation for a `PluginRoutes` declaration.
 *
 * Throws `FilterError` on:
 * 1. Unknown `filterType` (not one of the 11 `CustomFilterType` values)
 * 2. A custom filter name that collides with a default-filter field name
 *    (`status`, `closeDateRange`, `totalFundingAvailableRange`,
 *    `minAwardAmountRange`, `maxAwardAmountRange`)
 * 3. Filters declared on a route that does not support custom filters — a
 *    `resource.method` not in `SUPPORTED_CUSTOM_FILTER_ROUTES` (e.g.
 *    `opportunities.list`, whose core operation declares no `filters`)
 *
 * Duplicate filter names within a route-method need no check: filter names are
 * object keys, and JS object literals cannot represent duplicate keys.
 *
 * Implements ASVS L1 input validation at the plugin-author trust boundary.
 *
 * @param routes - The PluginRoutes declaration to validate
 * @throws {FilterError} on any constraint violation
 */
export function validateRoutes(routes: PluginRoutes): void {
  for (const [resourceKey, methods] of Object.entries(routes)) {
    // Partial<Record<...>> admits explicitly-undefined values; skip them.
    if (!methods) continue;
    for (const [methodKey, declarations] of Object.entries(methods)) {
      const filters = (declarations as RouteDeclarations | undefined)?.filters;
      if (!filters) continue;

      if (!SUPPORTED_CUSTOM_FILTER_ROUTES.has(`${resourceKey}.${methodKey}`)) {
        const supported = [...SUPPORTED_CUSTOM_FILTER_ROUTES].join(", ");
        throw new FilterError(
          `Route "${resourceKey}.${methodKey}" does not support custom filters (supported: ${supported})`,
          { path: `routes.${resourceKey}.${methodKey}`, sourceValue: filters }
        );
      }

      for (const [filterName, spec] of Object.entries(filters)) {
        const path = `routes.${resourceKey}.${methodKey}.filters.${filterName}`;

        // Plain-JS callers can pass explicitly-undefined specs; skip them like
        // the resource and method levels above.
        if (!spec) continue;

        // Check for unknown filterType
        if (!VALID_FILTER_TYPES.has(spec.filterType)) {
          throw new FilterError(
            `Unknown filterType "${spec.filterType}" for filter "${filterName}". ` +
              `Must be one of: ${[...VALID_FILTER_TYPES].join(", ")}`,
            { path, sourceValue: spec }
          );
        }

        // Check for collision with default-filter field names
        if (DEFAULT_FILTER_NAMES.has(filterName)) {
          throw new FilterError(
            `Custom filter name "${filterName}" collides with a default filter field. ` +
              `Default filter names are reserved: ${[...DEFAULT_FILTER_NAMES].join(", ")}`,
            { path, sourceValue: spec }
          );
        }
      }
    }
  }
}

/** The value shape each operator expects, used to explain an ad-hoc mismatch. */
const AD_HOC_VALUE_EXPECTATION: Record<string, string> = {
  eq: "a scalar value",
  neq: "a scalar value",
  gt: "a scalar value",
  gte: "a scalar value",
  lt: "a scalar value",
  lte: "a scalar value",
  in: "an array value",
  notIn: "an array value",
  like: "a string value",
  notLike: "a string value",
  between: "a { min, max } object",
  outside: "a { min, max } object",
};

// ############################################################################
// Public — validateFilterCall (call-time validation)
// ############################################################################

/**
 * Call-time validation for a single filter value against its registered spec.
 *
 * - For REGISTERED filters (spec provided): validates the `{operator, value}`
 *   pair against the filterType's Zod schema — each schema constrains both the
 *   allowed operator enum and the value shape, so one parse covers both checks.
 * - For AD-HOC filters (spec is undefined): the `{operator, value}` pair must be
 *   well-formed for some known filterType (checked against `FILTER_TYPE_SCHEMAS`,
 *   the same map registered filters use). The element type is not pinned to one
 *   type, since ad-hoc filters carry no `filterType`.
 *
 * Fail-soft: returns a `FilterError` describing the problem, or `undefined`
 * when the value is valid. The caller (`classifyFilters`) throws returned
 * errors rather than aborting the whole call.
 *
 * @param spec - The registered `CustomFilterSpec` for this filter, or `undefined` for ad-hoc
 * @param filterName - The filter key (used in error `path`)
 * @param filterValue - The raw filter value from the consumer `filters` object
 * @returns A `FilterError` on operator/filterType mismatch or value-shape mismatch, else `undefined`
 */
export function validateFilterCall(
  spec: CustomFilterSpec | undefined,
  filterName: string,
  filterValue: unknown
): FilterError | undefined {
  const path = `filters.${filterName}`;

  if (spec === undefined) {
    // Ad-hoc filter — no declared filterType, so accept it when its
    // {operator, value} is well-formed for SOME known filterType. This reuses
    // FILTER_TYPE_SCHEMAS (the single source of truth) rather than a parallel
    // schema, and picks up new filter types automatically.
    const matchesKnownType = Object.values(FILTER_TYPE_SCHEMAS).some(
      schema => schema.safeParse(filterValue).success
    );
    if (!matchesKnownType) {
      // Derive a targeted message from the operator rather than surfacing the
      // combined Zod error across every candidate schema.
      const operator = (filterValue as { operator?: unknown } | null)?.operator;
      let detail: string;
      if (typeof operator !== "string") {
        detail = "expected a { operator, value } object";
      } else if (!(operator in AD_HOC_VALUE_EXPECTATION)) {
        detail = `operator "${operator}" is not a known filter operator`;
      } else {
        detail = `operator "${operator}" expects ${AD_HOC_VALUE_EXPECTATION[operator]}`;
      }
      return new FilterError(
        `Ad-hoc filter "${filterName}" has an invalid operator/value combination: ${detail}`,
        { path, sourceValue: filterValue }
      );
    }
    return undefined;
  }

  // Registered filter — validate against the filterType's schema
  const schema = FILTER_TYPE_SCHEMAS[spec.filterType];
  if (!schema) {
    // Should not reach here if validateRoutes was called first, but guard anyway
    return new FilterError(
      `Unknown filterType "${spec.filterType}" for registered filter "${filterName}"`,
      { path, sourceValue: filterValue }
    );
  }

  // One parse validates both the operator enum and the value shape
  const result = schema.safeParse(filterValue);
  if (!result.success) {
    return new FilterError(
      `Filter "${filterName}" (filterType: "${spec.filterType}") failed validation: ${result.error.message}`,
      { path, sourceValue: filterValue }
    );
  }

  return undefined;
}

// ############################################################################
// Public — classifyFilters (fail-fast classifier)
// ############################################################################

/**
 * Classifies a flat consumer `filters` object into the ADR-0012 `OppFilters`
 * request body, throwing on the first invalid value instead of dropping it.
 *
 * Three-bucket classification (defaults → top-level
 * fields; registered + ad-hoc → `customFilters`), but validation is fail-fast:
 * any invalid value — standard, registered, or ad-hoc — throws before a request
 * body is produced. Well-formed ad-hoc (unregistered) keys still pass through.
 *
 * @param routes - The `PluginRoutes` from the plugin definition
 * @param resourceKey - The resource name (e.g. `"opportunities"`)
 * @param methodKey - The method name (e.g. `"search"`)
 * @param consumerFilters - The flat consumer-facing filters object
 * @returns The classified `OppFilters` request body
 * @throws FilterError on the first invalid filter value
 */
export function classifyFilters(
  routes: PluginRoutes,
  resourceKey: string,
  methodKey: string,
  consumerFilters: Record<string, unknown>
): z.infer<typeof OppFiltersSchema> {
  // Resolve registered filter specs for this route-method. The selectors are
  // runtime strings; cast them rather than widening the routes map.
  const registeredFilters: Record<string, CustomFilterSpec> =
    routes[resourceKey as ResourceName]?.[methodKey as RouteMethod]?.filters ?? {};

  const defaultFields: Partial<z.infer<typeof OppDefaultFiltersSchema>> = {};
  const customFilters: Record<string, z.infer<typeof DefaultFilterSchema>> = {};

  for (const [key, value] of Object.entries(consumerFilters)) {
    const spec = registeredFilters[key] as CustomFilterSpec | undefined;

    if (DEFAULT_FILTER_NAMES.has(key)) {
      // Bucket 1: default filter → top-level named field, validated against its
      // real type from OppDefaultFiltersSchema. An invalid value throws.
      const fieldSchema = (OppDefaultFiltersSchema.shape as Record<string, z.ZodTypeAny>)[key];
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        throw new FilterError(
          `Default filter "${key}" failed validation: ${result.error.message}`,
          {
            path: `filters.${key}`,
            sourceValue: value,
          }
        );
      }
      (defaultFields as Record<string, unknown>)[key] = value;
    } else {
      // Bucket 2 (registered custom) or Bucket 3 (ad-hoc / gov.* namespaced).
      // An invalid value throws — including a malformed ad-hoc shape.
      const error = validateFilterCall(spec, key, value);
      if (error) {
        throw error;
      }
      customFilters[key] = value as z.infer<typeof DefaultFilterSchema>;
    }
  }

  // Omit customFilters key entirely when empty (match nullish shape)
  return {
    ...defaultFields,
    ...(Object.keys(customFilters).length > 0 ? { customFilters } : {}),
  };
}
