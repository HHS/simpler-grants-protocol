/**
 * Custom Filters Extension
 *
 * Provides the classifier, validators, and F helper namespace for the custom-filters surface.
 *
 * - `classifyFilters` — transforms a flat consumer `filters` object into the
 *   ADR-0012 `OppFilters` request body (three-bucket: default → named top-level fields;
 *   registered custom → `customFilters`; ad-hoc → `customFilters` passthrough).
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
import type { CustomFilterSpec, CustomFilterType, PluginRoutes, RouteDeclarations } from "./types";
import { FilterError } from "./types";

// ############################################################################
// Public — filter-type catalog
// ############################################################################

/**
 * Maps each CustomFilterType to the Zod schema that validates its
 * `{operator, value}` pair. Each schema constrains both the allowed operator
 * enum and the value shape, so a single parse covers both checks.
 *
 * Exported read-only for consumer introspection (enumerate valid filter types,
 * drive a UI, or validate a filter bag independently). The catalog is closed —
 * adding a filter type is a spec/SDK change, not a runtime extension point.
 */
export const FILTER_TYPE_SCHEMAS: Record<CustomFilterType, z.ZodTypeAny> = {
  stringComparison: StringComparisonFilterSchema,
  stringArray: StringArrayFilterSchema,
  numberComparison: NumberComparisonFilterSchema,
  numberArray: NumberArrayFilterSchema,
  numberRange: NumberRangeFilterSchema,
  // integerComparison reuses NumberComparisonFilterSchema — the spec defines no
  // integer filter model, so the int constraint is not schema-enforced
  integerComparison: NumberComparisonFilterSchema,
  booleanComparison: BooleanComparisonFilterSchema,
  dateComparison: DateComparisonFilterSchema,
  dateRange: DateRangeFilterSchema,
  moneyComparison: MoneyComparisonFilterSchema,
  moneyRange: MoneyRangeFilterSchema,
};

/**
 * All 11 valid CustomFilterType values — used for unknown-filterType detection.
 */
const VALID_FILTER_TYPES = new Set<string>(Object.keys(FILTER_TYPE_SCHEMAS));

/**
 * The default-filter field names from `OppDefaultFiltersSchema`.
 * Custom filter names must not collide with these.
 */
const DEFAULT_FILTER_NAMES = new Set<string>(Object.keys(OppDefaultFiltersSchema.shape));

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
  eq: (value: unknown) => ({ operator: "eq" as const, value }),
  /** Not equals — `{ operator: "neq", value }` */
  neq: (value: unknown) => ({ operator: "neq" as const, value }),
  /** Greater than — `{ operator: "gt", value }` */
  gt: (value: unknown) => ({ operator: "gt" as const, value }),
  /** Greater than or equal — `{ operator: "gte", value }` */
  gte: (value: unknown) => ({ operator: "gte" as const, value }),
  /** Less than — `{ operator: "lt", value }` */
  lt: (value: unknown) => ({ operator: "lt" as const, value }),
  /** Less than or equal — `{ operator: "lte", value }` */
  lte: (value: unknown) => ({ operator: "lte" as const, value }),
  /** Array inclusion — `{ operator: "in", value: [...] }` */
  in: (value: unknown[]) => ({ operator: "in" as const, value }),
  /** Array exclusion — `{ operator: "notIn", value: [...] }` */
  notIn: (value: unknown[]) => ({ operator: "notIn" as const, value }),
  /** String pattern match — `{ operator: "like", value }` */
  like: (value: string) => ({ operator: "like" as const, value }),
  /** String pattern non-match — `{ operator: "notLike", value }` */
  notLike: (value: string) => ({ operator: "notLike" as const, value }),
  /** Range (inclusive) — `{ operator: "between", value: { min, max } }` */
  between: (min: unknown, max: unknown) => ({ operator: "between" as const, value: { min, max } }),
  /** Range (exclusive) — `{ operator: "outside", value: { min, max } }` */
  outside: (min: unknown, max: unknown) => ({ operator: "outside" as const, value: { min, max } }),
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
    for (const [methodKey, declarations] of Object.entries(methods)) {
      const filters = (declarations as RouteDeclarations).filters;
      if (!filters) continue;

      for (const [filterName, spec] of Object.entries(filters)) {
        const path = `routes.${resourceKey}.${methodKey}.filters.${filterName}`;

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

// ############################################################################
// Public — validateFilterCall (call-time validation)
// ############################################################################

/**
 * Call-time validation for a single filter value against its registered spec.
 *
 * - For REGISTERED filters (spec provided): validates the `{operator, value}`
 *   pair against the filterType's Zod schema — each schema constrains both the
 *   allowed operator enum and the value shape, so one parse covers both checks.
 * - For AD-HOC filters (spec is undefined): shape-only check against
 *   `DefaultFilterSchema` (no operator/filterType enforcement — accepted trade-off).
 *
 * @param spec - The registered `CustomFilterSpec` for this filter, or `undefined` for ad-hoc
 * @param filterName - The filter key (used in error `path`)
 * @param filterValue - The raw filter value from the consumer `filters` object
 * @throws {FilterError} on operator/filterType mismatch or value-shape mismatch
 */
export function validateFilterCall(
  spec: CustomFilterSpec | undefined,
  filterName: string,
  filterValue: unknown
): void {
  const path = `filters.${filterName}`;

  if (spec === undefined) {
    // Ad-hoc filter — shape-only check against DefaultFilterSchema
    const result = DefaultFilterSchema.safeParse(filterValue);
    if (!result.success) {
      throw new FilterError(
        `Ad-hoc filter "${filterName}" has an invalid shape: ${result.error.message}`,
        { path, sourceValue: filterValue }
      );
    }
    return;
  }

  // Registered filter — validate against the filterType's schema
  const schema = FILTER_TYPE_SCHEMAS[spec.filterType];
  if (!schema) {
    // Should not reach here if validateRoutes was called first, but guard anyway
    throw new FilterError(
      `Unknown filterType "${spec.filterType}" for registered filter "${filterName}"`,
      { path, sourceValue: filterValue }
    );
  }

  // One parse validates both the operator enum and the value shape
  const result = schema.safeParse(filterValue);
  if (!result.success) {
    throw new FilterError(
      `Filter "${filterName}" (filterType: "${spec.filterType}") failed validation: ${result.error.message}`,
      { path, sourceValue: filterValue }
    );
  }
}

// ############################################################################
// Public — classifyFilters (three-bucket classifier)
// ############################################################################

/**
 * Classifies a flat consumer `filters` object into the ADR-0012 `OppFilters` request body.
 *
 * Three-bucket classification:
 * 1. **Default filters** — keys present in `OppDefaultFiltersSchema` (e.g. `status`,
 *    `closeDateRange`) → top-level named fields on the request body.
 * 2. **Registered custom filters** — keys declared in the route-method's `filters`
 *    spec → `customFilters[name]`.
 * 3. **Ad-hoc filters** — unregistered keys (not in defaults, not in spec) →
 *    `customFilters[name]` passthrough.
 *
 * `gov.<system>@<filterName>` namespaced keys are treated as ad-hoc custom
 * filter keys and flow into `customFilters` verbatim — no auto-migration.
 *
 * Call-time validation (`validateFilterCall`) is run for each key during classification.
 *
 * @param routes - The `PluginRoutes` from the plugin definition
 * @param resourceKey - The resource name (e.g. `"opportunities"`)
 * @param methodKey - The method name (e.g. `"search"`)
 * @param consumerFilters - The flat consumer-facing filters object
 * @returns The classified `OppFilters` request body
 */
export function classifyFilters(
  routes: PluginRoutes,
  resourceKey: string,
  methodKey: string,
  consumerFilters: Record<string, unknown>
): z.infer<typeof OppFiltersSchema> {
  // Resolve registered filter specs for this route-method
  const registeredFilters: Record<string, CustomFilterSpec> =
    routes[resourceKey]?.[methodKey]?.filters ?? {};

  const defaultFields: Partial<z.infer<typeof OppDefaultFiltersSchema>> = {};
  const customFilters: Record<string, z.infer<typeof DefaultFilterSchema>> = {};

  for (const [key, value] of Object.entries(consumerFilters)) {
    // Look up registered spec (undefined for ad-hoc and gov.* namespaced keys)
    const spec = registeredFilters[key] as CustomFilterSpec | undefined;

    if (DEFAULT_FILTER_NAMES.has(key)) {
      // Bucket 1: default filter → top-level named field.
      // Default keys get shape-only validation via DefaultFilterSchema (the same
      // treatment as ad-hoc keys); per-field type enforcement against
      // OppDefaultFiltersSchema is intentionally not applied here. The server
      // validates default fields and reports any it cannot apply.
      validateFilterCall(undefined, key, value);
      (defaultFields as Record<string, unknown>)[key] = value;
    } else {
      // Bucket 2 (registered custom) or Bucket 3 (ad-hoc / gov.* namespaced)
      // Run call-time validation — passes spec if registered, undefined if ad-hoc
      validateFilterCall(spec, key, value);
      customFilters[key] = value as z.infer<typeof DefaultFilterSchema>;
    }
  }

  // Build request body — omit customFilters key entirely when empty (match nullish shape)
  const requestBody: z.infer<typeof OppFiltersSchema> = {
    ...defaultFields,
    ...(Object.keys(customFilters).length > 0 ? { customFilters } : {}),
  };

  return requestBody;
}
