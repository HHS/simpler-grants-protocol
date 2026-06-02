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
} from "./types";
import { EXTENSIBLE_SCHEMA_MAP } from "./types";
import { withCustomFields, type WithCustomFieldsResult } from "./with-custom-fields";

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
 * for JSON-safe config (mappings, meta) that can be stored and composed via
 * `mergeExtensions()` across packages. Custom field declarations belong
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
   * Stored as-is in the PoC (no compilation, no Zod-wrap); the full SDK compiles
   * `ObjectSchemasInput` → `ObjectSchemas` and injects the generated `common` model.
   */
  schemas?: T;
}

/**
 * Configuration object returned by `definePlugin()`.
 *
 * - `extensions` — serializable plugin config (mappings, meta), preserved by reference
 * - `schemas` — per-object compiled output: `common` (extended Zod schema), `native`,
 *   `toCommon`, and `fromCommon` for each extensible model
 * - `meta` — plugin identity passed through from options
 */
export interface Plugin<T extends SchemasInput = SchemasInput> {
  extensions?: PluginExtensions;
  schemas: PluginSchemas<T>;
  meta?: PluginMeta;
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
export function definePlugin<const T extends SchemasInput>(
  options: DefinePluginOptions<T>
): Plugin<T> {
  const { extensions, meta, schemas: schemasInput } = options;
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
    schemas[name] = {
      common,
      native: schemasInput?.[name]?.native,
      toCommon: schemasInput?.[name]?.toCommon,
      fromCommon: schemasInput?.[name]?.fromCommon,
    };
  }

  // Cast is safe — the runtime loop mirrors the PluginSchemas<T> mapped type,
  // but TypeScript can't verify that from the dynamic Object.entries() iteration.
  return { extensions, schemas, meta } as Plugin<T>;
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
