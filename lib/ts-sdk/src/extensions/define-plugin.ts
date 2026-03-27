/**
 * Provides the `definePlugin()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type {
  ExtensibleSchemaName,
  HasCustomFields,
  SchemaExtensions,
  CustomFieldSpec,
} from "./types";
import { EXTENSIBLE_SCHEMA_MAP } from "./types";
import { withCustomFields, type WithCustomFieldsResult } from "./with-custom-fields";

// ############################################################################
// Public types - DefinePluginOptions, Plugin
// ############################################################################

/**
 * Options for `definePlugin()`.
 *
 * Accepts an `extensions` property with custom field specifications.
 * Structured as an options object for forward-compatibility with future
 * properties like `namespace`.
 */
export interface DefinePluginOptions<T extends SchemaExtensions = SchemaExtensions> {
  /** Custom field specifications for extensible models */
  extensions: T;
}

/**
 * Configuration object returned by `definePlugin()`.
 *
 * - `extensions` — the original `SchemaExtensions` input (preserved by reference)
 * - `schemas` — extensible schemas with custom fields applied where applicable
 */
export interface Plugin<T extends SchemaExtensions = SchemaExtensions> {
  extensions: T;
  schemas: PluginSchemas<T>;
}

// ############################################################################
// Public function - definePlugin()
// ############################################################################

/**
 * Creates a `Plugin` from the given options.
 *
 * Iterates over extensible schemas. For those with specs in `extensions`,
 * applies `withCustomFields()` to produce a typed schema. Others pass
 * through unchanged.
 *
 * @param options - Options containing custom field specifications
 * @returns A `Plugin` with `.extensions` and `.schemas`
 *
 * @example
 * ```typescript
 * const plugin = definePlugin({
 *   extensions: {
 *     Opportunity: {
 *       legacyId: { fieldType: "string" },
 *       category: { fieldType: "string", description: "Grant category" },
 *     },
 *   },
 * } as const);
 *
 * // plugin.schemas.Opportunity has typed customFields
 * ```
 */
export function definePlugin<const T extends SchemaExtensions>(
  options: DefinePluginOptions<T>
): Plugin<T> {
  const { extensions } = options;
  const schemas: Record<string, z.ZodTypeAny> = {};

  // Walk every extensible model. If the caller supplied specs for it,
  // produce a schema with typed customFields; otherwise keep the base schema.
  for (const [name, extensibleSchema] of Object.entries(EXTENSIBLE_SCHEMA_MAP) as [
    ExtensibleSchemaName,
    HasCustomFields,
  ][]) {
    const specs = extensions[name as ExtensibleSchemaName];
    if (specs && Object.keys(specs).length > 0) {
      schemas[name] = withCustomFields(extensibleSchema, specs);
    } else {
      schemas[name] = extensibleSchema;
    }
  }

  // Cast is safe — the runtime loop mirrors the PluginSchemas<T> mapped type,
  // but TypeScript can't verify that from the dynamic Object.entries() iteration.
  return { extensions, schemas } as Plugin<T>;
}

// ############################################################################
// Internal - type inference utilities
// ############################################################################

/**
 * Computes the schema type for each extensible schema given extensions `T`.
 *
 * This mapped type iterates over every `ExtensibleSchemaName` (currently just
 * `"Opportunity"`) and decides what Zod schema type to assign:
 *
 * 1. `K extends keyof T` — does the plugin declare extensions for this model?
 * 2. `T[K] extends Record<string, CustomFieldSpec>` — are those extensions
 *    a non-empty specs record?
 *
 * If both are true, the schema is the result of `withCustomFields()` applied
 * to the base schema for that model. Otherwise the base schema passes through
 * unchanged.
 *
 * @example
 * ```typescript
 * // Given extensions that customize Opportunity:
 * type T = { Opportunity: { legacyId: { fieldType: "string" } } };
 *
 * // PluginSchemas<T> resolves to:
 * // { Opportunity: WithCustomFieldsResult<typeof OpportunityBaseSchema, T["Opportunity"]> }
 * ```
 */
/** Looks up the base Zod schema for an extensible model name. */
type BaseZodSchema<K extends ExtensibleSchemaName> = (typeof EXTENSIBLE_SCHEMA_MAP)[K];

/** Resolves the schema for a single model: applies extensions if present, else returns base. */
type ResolveSchema<K extends ExtensibleSchemaName, T extends SchemaExtensions> = K extends keyof T
  ? T[K] extends Record<string, CustomFieldSpec>
    ? WithCustomFieldsResult<BaseZodSchema<K>, T[K]>
    : BaseZodSchema<K>
  : BaseZodSchema<K>;

/** Maps each extensible model to its resolved schema. */
type PluginSchemas<T extends SchemaExtensions> = {
  [K in ExtensibleSchemaName]: ResolveSchema<K, T>;
};
