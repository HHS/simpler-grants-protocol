/**
 * Provides the `definePlugin()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import type {
  ExtensibleSchemaName,
  HasCustomFields,
  CustomFieldSpec,
  ObjectSchemasInput,
  PluginMeta,
  PluginExtensions,
  PluginRoutes,
} from "./types";
import { EXTENSIBLE_SCHEMA_MAP } from "./types";
import { withCustomFields, type WithCustomFieldsResult } from "./with-custom-fields";
import { buildTransforms } from "./transforms";

// ############################################################################
// Public types - SchemasInput, DefinePluginOptions, Plugin
// ############################################################################

/**
 * Per-object schemas input keyed by extensible model name.
 *
 * Plugin authors populate this with hand-written or `buildTransforms()`-generated
 * `toCommon` / `fromCommon` callables, an optional `native` schema, and optional
 * `customFields` specs. Passed as `DefinePluginOptions.schemas`.
 */
// Per-entry (TNative, TCommon) pairs only meet at the `buildTransforms()`
// boundary. `unknown` would reject legitimate caller schemas at contravariant
// positions; the widening lives only at this dictionary storage layer.
export type SchemasInput = Partial<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<ExtensibleSchemaName, ObjectSchemasInput<any, any>>
>;

/**
 * Options for `definePlugin()`.
 *
 * `schemas` carries the consolidated per-object input (custom fields,
 * native schema, transforms). `extensions` is the serializable-only surface
 * for JSON-safe config (mappings, meta). Custom field declarations belong
 * exclusively on `schemas[Object].customFields`.
 *
 * Structured as an options object for forward-compatibility with future
 * properties like `namespace`.
 */
export interface DefinePluginOptions<T extends SchemasInput = SchemasInput> {
  /**
   * Serializable plugin config — mappings and meta, safe to store as JSON.
   *
   * Does not carry `customFields`; those belong on `schemas[Object].customFields`.
   */
  extensions?: PluginExtensions;
  /** Optional plugin identity and capability declaration. */
  meta?: PluginMeta;
  /**
   * Per-object transform input — `native` schema, `customFields` specs,
   * and `toCommon` / `fromCommon` callables — for each extensible model.
   *
   * This is the single surface for custom field declarations.
   *
   * `definePlugin()` compiles this into runtime schemas: `common` is built via
   * `withCustomFields()` when `customFields` are declared; `toCommon` / `fromCommon`
   * are auto-wired from `extensions.schemas[Name].mappings` when no explicit
   * callables are provided. Native input Zod-wrapping remains deferred.
   */
  schemas?: T;
  /**
   * Route-keyed custom filter declarations.
   *
   * Passed through unchanged to `Plugin.routes`. Filters attach to resource
   * methods (e.g. `opportunities.search.filters`), not to a schema key — because
   * filters vary asymmetrically across methods.
   *
   * Registration-time validation (`validateRoutes`) and call-time classification
   * (`classifyFilters`) consume these declarations.
   *
   * @example
   * ```typescript
   * definePlugin({
   *   routes: {
   *     opportunities: {
   *       search: {
   *         filters: {
   *           agency: { filterType: "stringArray" },
   *         },
   *       },
   *     },
   *   },
   * } as const)
   * ```
   */
  routes?: PluginRoutes;
}

/**
 * Configuration object returned by `definePlugin()`.
 *
 * - `extensions` — serializable plugin config (mappings, meta), preserved by reference
 * - `schemas` — per-object compiled output: `common` (extended Zod schema), `native`,
 *   `toCommon`, and `fromCommon` for each extensible model
 * - `meta` — plugin identity passed through from options
 * - `routes` — route-keyed custom filter declarations; when defined `as const`, the
 *   literal `filterType` values are preserved so that `TypedConsumerFilters`
 *   can narrow call-site filter keys, operators, and value shapes.
 *
 * The second generic parameter `TRoutes` captures the literal routes type when the
 * caller uses `as const`. Callers that do not care about typed narrowing can ignore it
 * (the default is `PluginRoutes`).
 */
export interface Plugin<
  T extends SchemasInput = SchemasInput,
  TRoutes extends PluginRoutes = PluginRoutes,
> {
  extensions?: PluginExtensions;
  schemas: PluginSchemas<T>;
  meta?: PluginMeta;
  /** Route-keyed custom filter declarations, passed through unchanged from `DefinePluginOptions.routes`. */
  routes?: TRoutes;
}

// ############################################################################
// Public function - definePlugin()
// ############################################################################

/**
 * Creates a `Plugin` from the given options.
 *
 * Iterates over extensible schemas. For each model, looks up `customFields`
 * specs from `schemas[name].customFields`. When specs are present, applies
 * `withCustomFields()` to produce a typed `common` schema; otherwise the base
 * schema passes through unchanged. The per-object result is wrapped under
 * `.common` alongside any `native`, `toCommon`, and `fromCommon` provided.
 *
 * @param options - Options containing schemas and/or serializable extensions
 * @returns A `Plugin` with `.extensions`, `.schemas`, and `.meta`
 *
 * @example
 * ```typescript
 * const plugin = definePlugin({
 *   schemas: {
 *     Opportunity: {
 *       customFields: {
 *         legacyId: { fieldType: "string" },
 *         category: { fieldType: "string", description: "Grant category" },
 *       },
 *       toCommon,
 *       fromCommon,
 *     },
 *   },
 * } as const);
 *
 * // Access the extended Zod schema:
 * const opp = plugin.schemas.Opportunity.common.parse(rawData);
 * // Access the transform callables:
 * const result = plugin.schemas.Opportunity.toCommon?.(nativeData);
 * ```
 */
export function definePlugin<
  const T extends SchemasInput,
  const TRoutes extends PluginRoutes = PluginRoutes,
>(options: DefinePluginOptions<T> & { routes?: TRoutes }): Plugin<T, TRoutes> {
  const { extensions, meta, schemas: schemasInput, routes } = options;
  const schemas: Record<string, object> = {};

  for (const [name, extensibleSchema] of Object.entries(EXTENSIBLE_SCHEMA_MAP) as [
    ExtensibleSchemaName,
    HasCustomFields,
  ][]) {
    const specs = schemasInput?.[name]?.customFields;
    const common =
      specs && Object.keys(specs).length > 0
        ? withCustomFields(extensibleSchema, specs)
        : extensibleSchema;

    const explicitToCommon = schemasInput?.[name]?.toCommon;
    const explicitFromCommon = schemasInput?.[name]?.fromCommon;
    const mappings = extensions?.schemas?.[name]?.mappings;
    const nativeSchema = schemasInput?.[name]?.native;

    // Auto-wire from declarative mappings when no explicit callables are supplied.
    // All-or-nothing: any explicit callable disables auto-wiring for this object
    // (mirrors Python's explicit_objs vs mappings_objs logic in generate.py).
    let toCommon = explicitToCommon;
    let fromCommon = explicitFromCommon;

    if (
      mappings !== undefined &&
      explicitToCommon === undefined &&
      explicitFromCommon === undefined
    ) {
      if (mappings.toCommon === undefined) {
        throw new Error(
          `definePlugin: ${name}.mappings.toCommon is required when auto-generating transforms. ` +
            `Either provide both mapping directions or pass explicit toCommon/fromCommon callables.`
        );
      }
      if (mappings.fromCommon === undefined) {
        throw new Error(
          `definePlugin: ${name}.mappings.fromCommon is required when auto-generating transforms. ` +
            `Either provide both mapping directions or pass explicit toCommon/fromCommon callables.`
        );
      }
      // Pass `common` as commonModel so validateOutputPaths runs against the
      // fully-resolved schema (base or extended). Key-existence checking is correct
      // regardless of whether customFields were declared — this is not the same as
      // the "base schema weakens custom-field type validation" warning in buildTransforms'
      // JSDoc, which applies to Zod-type checking of custom field values at runtime.
      const built = buildTransforms(mappings.toCommon, mappings.fromCommon, undefined, common);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toCommon = built.toCommon as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromCommon = built.fromCommon as any;
    }

    schemas[name] = { common, native: nativeSchema, toCommon, fromCommon };
  }

  // Cast is safe — the runtime loop mirrors the PluginSchemas<T> mapped type,
  // but TypeScript can't verify that from the dynamic Object.entries() iteration.
  // The second generic TRoutes preserves the literal routes type from `as const` calls.
  return { extensions, schemas, meta, routes } as Plugin<T, TRoutes>;
}

// ############################################################################
// Internal - type inference utilities
// ############################################################################

/** Looks up the base Zod schema for an extensible model name. */
type BaseZodSchema<K extends ExtensibleSchemaName> = (typeof EXTENSIBLE_SCHEMA_MAP)[K];

/**
 * Extracts the `customFields` record from `T[K]`, or `never` if absent.
 *
 * Used to feed the custom-fields spec into `WithCustomFieldsResult` while
 * keeping the base schema as the fallback when no specs are declared.
 */
type ExtractCustomFields<K extends ExtensibleSchemaName, T extends SchemasInput> = K extends keyof T
  ? NonNullable<T[K]> extends { customFields?: infer CF }
    ? CF extends Record<string, CustomFieldSpec>
      ? CF
      : never
    : never
  : never;

/** Resolves the `common` Zod schema for a single model. */
type ResolveCommonSchema<K extends ExtensibleSchemaName, T extends SchemasInput> = [
  ExtractCustomFields<K, T>,
] extends [never]
  ? BaseZodSchema<K>
  : WithCustomFieldsResult<BaseZodSchema<K>, ExtractCustomFields<K, T>>;

/**
 * Maps each extensible model to its compiled per-object output.
 *
 * Each entry contains:
 * - `common` — the fully extended Zod schema (base + custom fields)
 * - `native` — the optional native-format Zod schema
 * - `toCommon` / `fromCommon` — typed transform callables derived from `T[K]`
 */
type PluginSchemas<T extends SchemasInput> = {
  [K in ExtensibleSchemaName]: {
    common: ResolveCommonSchema<K, T>;
    native: K extends keyof T ? NonNullable<T[K]>["native"] : undefined;
    toCommon: K extends keyof T ? NonNullable<T[K]>["toCommon"] : undefined;
    fromCommon: K extends keyof T ? NonNullable<T[K]>["fromCommon"] : undefined;
  };
};
