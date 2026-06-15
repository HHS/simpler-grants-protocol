/**
 * Provides the `definePlugin()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type {
  ExtensibleSchemaName,
  HasCustomFields,
  CustomFieldSpec,
  SchemaInput,
  SchemaMappings,
  PluginMeta,
  TransformResult,
} from "./types";
import { EXTENSIBLE_SCHEMA_MAP, TransformError } from "./types";
import { withCustomFields, type WithCustomFieldsResult } from "./with-custom-fields";
import { buildTransforms } from "./transforms";

// ############################################################################
// Public types - PluginSchemasInput, DefinePluginOptions, Plugin
// ############################################################################

/**
 * Per-object schemas input keyed by extensible model name.
 *
 * Plugin authors populate this with hand-written or `buildTransforms()`-generated
 * `toCommon` / `fromCommon` callables, an optional `sourceSchema`, and optional
 * `customFields` specs. Passed as `DefinePluginOptions.schemas`.
 */
export type PluginSchemasInput = Partial<Record<ExtensibleSchemaName, SchemaInput>>;

/**
 * Options for `definePlugin()`.
 *
 * `schemas` is the single surface for all per-object declarations: custom
 * fields, source schema, declarative `mappings`, and explicit transform
 * callables. Inputs are declarative wherever possible; explicit callables are
 * available when custom code-driven logic is needed.
 *
 * Structured as an options object for forward-compatibility with future
 * properties like `namespace`.
 */
export interface DefinePluginOptions<T extends PluginSchemasInput = PluginSchemasInput> {
  /** Optional plugin identity and capability declaration. */
  meta?: PluginMeta;
  /**
   * Per-object input — `sourceSchema`, `customFields` specs, declarative
   * `mappings`, and `toCommon` / `fromCommon` callables — for each extensible model.
   *
   * `definePlugin()` compiles this into runtime schemas: `commonSchema` is built via
   * `withCustomFields()` when `customFields` are declared; `toCommon` / `fromCommon`
   * are auto-wired from `schemas[Name].mappings` when `mappings` is used. Providing
   * both `mappings` and explicit callables is a runtime error.
   */
  schemas?: T;
}

/**
 * Configuration object returned by `definePlugin()`.
 *
 * - `schemas` — per-object compiled output: `commonSchema` (extended Zod schema),
 *   `sourceSchema`, `toCommon`, and `fromCommon` for each extensible model
 * - `meta` — plugin identity passed through from options
 */
export interface Plugin<T extends PluginSchemasInput = PluginSchemasInput> {
  schemas: PluginSchemas<T>;
  meta?: PluginMeta;
}

// ############################################################################
// Internal helper - wrapWithSchemaValidation
// ############################################################################

/**
 * Wrap a transform callable to validate its output against a Zod schema.
 *
 * If the callable returns errors, those are returned unchanged. Otherwise the
 * output is passed through `schema.safeParse()`; any Zod issues are flattened
 * into `TransformResult.errors`.
 *
 * @internal
 */
function wrapWithSchemaValidation<TIn, TOut>(
  fn: (input: TIn) => TransformResult<TOut>,
  // `any` lets this accept schemas with .transform() whose input type differs
  // from the output type. `unknown` would reject those valid schemas here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<TOut, z.ZodTypeDef, any>
): (input: TIn) => TransformResult<TOut> {
  return (input: TIn): TransformResult<TOut> => {
    const result = fn(input);
    if (result.errors.length > 0) return result;
    const parsed = schema.safeParse(result.result);
    if (parsed.success) return { result: parsed.data, errors: [] };
    const errors = parsed.error.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.map(p => String(p)).join(".") : undefined;
      return new TransformError(issue.message, { path });
    });
    return { result: result.result, errors };
  };
}

// ############################################################################
// Public function - definePlugin()
// ############################################################################

/**
 * Creates a `Plugin` from the given options.
 *
 * Iterates over extensible schemas. For each model, looks up `customFields`
 * specs from `schemas[name].customFields`. When specs are present, applies
 * `withCustomFields()` to produce a typed `commonSchema`; otherwise the base
 * schema passes through unchanged. The per-object result is wrapped under
 * `.commonSchema` alongside any `sourceSchema`, `toCommon`, and `fromCommon` provided.
 *
 * @param options - Options containing `schemas` (per-object input) and optional `meta`
 * @returns A `Plugin` with `.schemas` and optional `.meta`
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
 * const opp = plugin.schemas.Opportunity.commonSchema.parse(rawData);
 * // Access the transform callables:
 * const result = plugin.schemas.Opportunity.toCommon?.(sourceData);
 * ```
 */
export function definePlugin<const T extends PluginSchemasInput>(
  options: DefinePluginOptions<T>
): Plugin<T> {
  const { meta, schemas: schemasInput } = options;
  const schemas: Record<string, object> = {};

  for (const [name, extensibleSchema] of Object.entries(EXTENSIBLE_SCHEMA_MAP) as [
    ExtensibleSchemaName,
    HasCustomFields,
  ][]) {
    const specs = schemasInput?.[name]?.customFields;
    const commonSchema =
      specs && Object.keys(specs).length > 0
        ? withCustomFields(extensibleSchema, specs)
        : extensibleSchema;

    const explicitToCommon = schemasInput?.[name]?.toCommon;
    const explicitFromCommon = schemasInput?.[name]?.fromCommon;
    const mappings = schemasInput?.[name]?.mappings;
    const sourceSchema = schemasInput?.[name]?.sourceSchema;

    // XOR: providing both mappings AND explicit callables is an error.
    const hasMappings = mappings !== undefined;
    const hasCallables = explicitToCommon !== undefined || explicitFromCommon !== undefined;
    if (hasMappings && hasCallables) {
      throw new Error(
        `definePlugin: ${name} cannot specify both mappings and explicit toCommon/fromCommon. ` +
          `Use mappings for declarative transforms or provide explicit callables, not both.`
      );
    }

    let toCommon = explicitToCommon;
    let fromCommon = explicitFromCommon;

    if (hasMappings) {
      // Mappings path: validate both directions are present, then auto-wire.
      if (mappings!.toCommon === undefined) {
        throw new Error(
          `definePlugin: ${name}.mappings.toCommon is required when auto-generating transforms. ` +
            `Either provide both mapping directions or pass explicit toCommon/fromCommon callables.`
        );
      }
      if (mappings!.fromCommon === undefined) {
        throw new Error(
          `definePlugin: ${name}.mappings.fromCommon is required when auto-generating transforms. ` +
            `Either provide both mapping directions or pass explicit toCommon/fromCommon callables.`
        );
      }
      // Pass `commonSchema` so validateOutputPaths runs against the fully-resolved
      // schema (base or extended with customFields). This catches typo'd output keys
      // at definition time rather than at first invocation.
      const built = buildTransforms(
        mappings!.toCommon,
        mappings!.fromCommon,
        undefined,
        commonSchema
      );
      // The specific (TSource, TCommon) types for this entry were erased when it
      // was stored in PluginSchemasInput above. Cast needed so the compiled transform
      // can be assigned back to the schema entry's callable slots.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toCommon = built.toCommon as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromCommon = built.fromCommon as any;
    } else if (hasCallables) {
      // Explicit callables path: validate both directions. A transforms entry
      // always carries a sourceSchema (see SchemaInput), so fromCommon output is
      // validated against it unconditionally, mirroring toCommon against commonSchema.
      if (toCommon !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toCommon = wrapWithSchemaValidation(toCommon as any, commonSchema as any) as any;
      }
      if (fromCommon !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fromCommon = wrapWithSchemaValidation(fromCommon as any, sourceSchema as any) as any;
      }
    }

    schemas[name] = {
      commonSchema,
      sourceSchema,
      // Keep customFields and mappings on the compiled entry so consumers can
      // inspect what was used to build the schema and transforms.
      customFields: specs && Object.keys(specs).length > 0 ? specs : undefined,
      mappings: hasMappings ? mappings : undefined,
      toCommon,
      fromCommon,
    };
  }

  // Cast is safe — the runtime loop mirrors the PluginSchemas<T> mapped type,
  // but TypeScript can't verify that from the dynamic Object.entries() iteration.
  return { schemas, meta } as Plugin<T>;
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
type ExtractCustomFields<
  K extends ExtensibleSchemaName,
  T extends PluginSchemasInput,
> = K extends keyof T
  ? NonNullable<T[K]> extends { customFields?: infer CF }
    ? CF extends Record<string, CustomFieldSpec>
      ? CF
      : never
    : never
  : never;

/** Resolves the `commonSchema` Zod schema for a single model. */
type ResolveCommonSchema<K extends ExtensibleSchemaName, T extends PluginSchemasInput> = [
  ExtractCustomFields<K, T>,
] extends [never]
  ? BaseZodSchema<K>
  : WithCustomFieldsResult<BaseZodSchema<K>, ExtractCustomFields<K, T>>;

/**
 * Returns `true` when `T[K]` has transforms: either a `mappings` entry or an
 * explicit `toCommon` callable. Used to produce the right callable type on the
 * compiled output — the input's `toCommon` is `never` in the mappings branch
 * of the `SchemaInput` XOR union, so we cannot just read `T[K]["toCommon"]`
 * directly for mappings-based entries.
 */
type EntryHasTransforms<
  K extends ExtensibleSchemaName,
  T extends PluginSchemasInput,
> = K extends keyof T
  ? NonNullable<T[K]> extends { mappings: SchemaMappings }
    ? true
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      NonNullable<T[K]> extends { toCommon: (...args: any[]) => any }
      ? true
      : false
  : false;

/**
 * Extracts the source `TSource` from the entry's `sourceSchema`, or `unknown`.
 */
type ExtractSourceType<
  K extends ExtensibleSchemaName,
  T extends PluginSchemasInput,
> = K extends keyof T
  ? NonNullable<T[K]>["sourceSchema"] extends z.ZodType<infer S>
    ? S
    : unknown
  : unknown;

/**
 * Maps each extensible model to its compiled per-object output.
 *
 * When the entry has transforms (mappings or explicit callables), both
 * `toCommon` and `fromCommon` are present and callable. When it is schema-only
 * (no transforms configured) they are absent. `customFields` and `mappings`
 * are kept for consumer inspection regardless of which path was used.
 */
type PluginSchemas<T extends PluginSchemasInput> = {
  [K in ExtensibleSchemaName]: EntryHasTransforms<K, T> extends true
    ? {
        commonSchema: ResolveCommonSchema<K, T>;
        sourceSchema: K extends keyof T ? NonNullable<T[K]>["sourceSchema"] : undefined;
        customFields: K extends keyof T ? NonNullable<T[K]>["customFields"] : undefined;
        mappings: K extends keyof T ? NonNullable<T[K]>["mappings"] : undefined;
        toCommon: (
          source: ExtractSourceType<K, T>
        ) => TransformResult<z.infer<ResolveCommonSchema<K, T>>>;
        fromCommon: (
          common: z.infer<ResolveCommonSchema<K, T>>
        ) => TransformResult<ExtractSourceType<K, T>>;
      }
    : {
        commonSchema: ResolveCommonSchema<K, T>;
        sourceSchema?: undefined;
        customFields: K extends keyof T ? NonNullable<T[K]>["customFields"] : undefined;
        mappings?: undefined;
        toCommon?: undefined;
        fromCommon?: undefined;
      };
};
