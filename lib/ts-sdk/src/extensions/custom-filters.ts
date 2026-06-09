/**
 * Custom Filters Extension
 *
 * Provides the classifier, validators, and F helper namespace for the custom-filters surface.
 *
 * - `classifyFilters` — transforms a flat consumer `filters` object into the
 *   ADR-0012 `OppFilters` wire body (three-bucket: default → named top-level fields;
 *   registered custom → `customFilters`; ad-hoc → `customFilters` passthrough).
 * - `validateRoutes` — registration-time validation; rejects unknown `filterType`,
 *   duplicate names, and custom names that collide with default-filter names.
 * - `validateFilterCall` — call-time validation; rejects operator/filterType mismatch
 *   and value-shape mismatches for registered filters; shape-only check for ad-hoc.
 * - `F` — helper namespace that compiles `{operator, value}` raw filter objects.
 *
 * Wire contract: ADR-0012 / OppFiltersSchema.
 * Core-field escape hatch: `gov.<system>@<filterName>` keys pass through as custom-filter
 * keys verbatim.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import { DefaultFilterSchema } from "../schemas/zod/filters";
import {
  BooleanComparisonFilterSchema,
  ComparisonOperatorsEnum,
  DateComparisonFilterSchema,
  DateRangeFilterSchema,
  EquivalenceOperatorsEnum,
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
import { PluginError } from "./types";

// ############################################################################
// Internal — filter-type metadata map
// ############################################################################

/**
 * Maps each CustomFilterType to its allowed Zod schema and the operator enum
 * that determines whether a given operator is valid for that type.
 *
 * `integerComparison` reuses `NumberComparisonFilterSchema` (the Zod-level int
 * constraint is not enforced here — it uses the same schema as
 * `numberComparison`). A dedicated `IntegerComparisonFilterSchema` with `.int()`
 * would tighten this.
 */
const FILTER_TYPE_SCHEMAS: Record<
  CustomFilterType,
  {
    schema: z.ZodTypeAny;
    operatorEnum:
      | z.ZodEnum<[string, ...string[]]>
      | z.ZodUnion<[z.ZodEnum<[string, ...string[]]>, ...z.ZodEnum<[string, ...string[]]>[]]>;
  }
> = {
  stringComparison: {
    schema: StringComparisonFilterSchema,
    operatorEnum: z.union([EquivalenceOperatorsEnum, z.enum(["like", "notLike"])]),
  },
  stringArray: {
    schema: StringArrayFilterSchema,
    operatorEnum: z.enum(["in", "notIn"]),
  },
  numberComparison: {
    schema: NumberComparisonFilterSchema,
    operatorEnum: z.union([ComparisonOperatorsEnum, EquivalenceOperatorsEnum]),
  },
  numberArray: {
    schema: NumberArrayFilterSchema,
    operatorEnum: z.enum(["in", "notIn"]),
  },
  numberRange: {
    schema: NumberRangeFilterSchema,
    operatorEnum: z.enum(["between", "outside"]),
  },
  // integerComparison reuses NumberComparisonFilterSchema — see module JSDoc
  integerComparison: {
    schema: NumberComparisonFilterSchema,
    operatorEnum: z.union([ComparisonOperatorsEnum, EquivalenceOperatorsEnum]),
  },
  booleanComparison: {
    schema: BooleanComparisonFilterSchema,
    operatorEnum: EquivalenceOperatorsEnum,
  },
  dateComparison: {
    schema: DateComparisonFilterSchema,
    operatorEnum: ComparisonOperatorsEnum,
  },
  dateRange: {
    schema: DateRangeFilterSchema,
    operatorEnum: z.enum(["between", "outside"]),
  },
  moneyComparison: {
    schema: MoneyComparisonFilterSchema,
    operatorEnum: ComparisonOperatorsEnum,
  },
  moneyRange: {
    schema: MoneyRangeFilterSchema,
    operatorEnum: z.enum(["between", "outside"]),
  },
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
 * Throws `PluginError` on:
 * 1. Unknown `filterType` (not one of the 11 `CustomFilterType` values)
 * 2. Duplicate filter names within a route-method (guards against Object.entries bugs)
 * 3. A custom filter name that collides with a default-filter field name
 *    (`status`, `closeDateRange`, `totalFundingAvailableRange`,
 *    `minAwardAmountRange`, `maxAwardAmountRange`)
 *
 * Implements ASVS L1 input validation at the plugin-author trust boundary.
 *
 * @param routes - The PluginRoutes declaration to validate
 * @throws {PluginError} on any constraint violation
 */
export function validateRoutes(routes: PluginRoutes): void {
  for (const [resourceKey, methods] of Object.entries(routes)) {
    for (const [methodKey, declarations] of Object.entries(methods)) {
      const filters = (declarations as RouteDeclarations).filters;
      if (!filters) continue;

      const seenNames = new Set<string>();

      for (const [filterName, spec] of Object.entries(filters)) {
        const path = `routes.${resourceKey}.${methodKey}.filters.${filterName}`;

        // Check for unknown filterType
        if (!VALID_FILTER_TYPES.has(spec.filterType)) {
          throw new PluginError(
            `Unknown filterType "${spec.filterType}" for filter "${filterName}". ` +
              `Must be one of: ${[...VALID_FILTER_TYPES].join(", ")}`,
            { path, sourceValue: spec }
          );
        }

        // Check for duplicate filter names (within this route-method)
        if (seenNames.has(filterName)) {
          throw new PluginError(
            `Duplicate filter name "${filterName}" in route ${resourceKey}.${methodKey}`,
            { path, sourceValue: spec }
          );
        }
        seenNames.add(filterName);

        // Check for collision with default-filter field names
        if (DEFAULT_FILTER_NAMES.has(filterName)) {
          throw new PluginError(
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
 * - For REGISTERED filters (spec provided): validates the operator against the
 *   filterType's allowed operator set, then validates the value shape against
 *   the filterType's Zod schema.
 * - For AD-HOC filters (spec is undefined): shape-only check against
 *   `DefaultFilterSchema` (no operator/filterType enforcement — accepted trade-off).
 *
 * @param spec - The registered `CustomFilterSpec` for this filter, or `undefined` for ad-hoc
 * @param filterName - The filter key (used in error `path`)
 * @param filterValue - The raw filter value from the consumer `filters` object
 * @throws {PluginError} on operator/filterType mismatch or value-shape mismatch
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
      throw new PluginError(
        `Ad-hoc filter "${filterName}" has an invalid shape: ${result.error.message}`,
        { path, sourceValue: filterValue }
      );
    }
    return;
  }

  // Registered filter — validate against the filterType's schema
  const typeMeta = FILTER_TYPE_SCHEMAS[spec.filterType];
  if (!typeMeta) {
    // Should not reach here if validateRoutes was called first, but guard anyway
    throw new PluginError(
      `Unknown filterType "${spec.filterType}" for registered filter "${filterName}"`,
      { path, sourceValue: filterValue }
    );
  }

  // Validate the value shape against the filterType's full schema
  const result = typeMeta.schema.safeParse(filterValue);
  if (!result.success) {
    throw new PluginError(
      `Filter "${filterName}" (filterType: "${spec.filterType}") failed validation: ${result.error.message}`,
      { path, sourceValue: filterValue }
    );
  }
}

// ############################################################################
// Public — classifyFilters (three-bucket classifier)
// ############################################################################

/**
 * Classifies a flat consumer `filters` object into the ADR-0012 `OppFilters` wire body.
 *
 * Three-bucket classification:
 * 1. **Default filters** — keys present in `OppDefaultFiltersSchema` (e.g. `status`,
 *    `closeDateRange`) → top-level named fields on the wire body.
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
 * @returns The classified `OppFilters` wire body
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

  // Build wire body — omit customFilters key entirely when empty (match nullish shape)
  const wireBody: z.infer<typeof OppFiltersSchema> = {
    ...defaultFields,
    ...(Object.keys(customFilters).length > 0 ? { customFilters } : {}),
  };

  return wireBody;
}
