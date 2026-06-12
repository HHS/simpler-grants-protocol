/**
 * Shared foundation types for the extensions module.
 *
 * Only types referenced by multiple files live here. Types specific to a
 * single utility function are co-located with that function.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomField, CustomFieldType } from "../types";
import { OpportunityBaseSchema } from "../schemas/zod/models";

// ############################################################################
// Public type - CustomFieldSpec
// ############################################################################

/**
 * Specification for a custom field to be registered on a schema, with an optional
 * Zod schema to validate the value property.
 *
 * @example
 * The following `CustomFieldSpec` object:
 *
 * ```typescript
 * const spec: CustomFieldSpec = {
 *   name: "Legacy ID",
 *   fieldType: "integer",
 *   value: z.number().int(),
 *   description: "An integer ID for the opportunity, needed for compatibility with legacy systems",
 * };
 * ```
 * Corresponds to the following custom field object:
 * ```json
 * {
 *   "name": "Legacy ID",
 *   "fieldType": "integer",
 *   "value": 12345,
 *   "description": "An integer ID for the opportunity, needed for compatibility with legacy systems",
 * }
 * ```
 */
export interface CustomFieldSpec {
  /** Optional display name; used as the default for CustomField.name when provided, otherwise the record key is used */
  name?: string;
  /** The JSON schema type for the field */
  fieldType: CustomFieldType;
  /** Optional Zod schema to validate the value property. Defaults based on fieldType */
  value?: z.ZodTypeAny;
  /** Optional description; used as the default for CustomField.description when present */
  description?: string;
}

// ############################################################################
// Public types - HasCustomFields, ExtensibleObject
// ############################################################################

/**
 * The expected Zod type for a `customFields` property on an extensible schema.
 *
 * Matches `z.record(CustomFieldSchema).nullish()`, which is the pattern used
 * by all base schemas in the SDK. The type is intentionally permissive about
 * the wrapping order (e.g. `.nullish()` vs `.optional().nullable()`) by
 * constraining only the output type.
 *
 * @internal
 */
type CustomFieldsZodType = z.ZodType<Record<string, CustomField> | null | undefined>;

/**
 * A Zod object schema whose shape includes a `customFields` property
 * typed as a record of `CustomField` values.
 *
 * Used to constrain the `baseSchema` parameter of `withCustomFields()` so that
 * schemas without a properly typed `customFields` are rejected at compile time.
 */
export type HasCustomFields = z.ZodObject<
  { customFields: CustomFieldsZodType } & z.ZodRawShape,
  z.UnknownKeysParam,
  z.ZodTypeAny
>;

/**
 * An object with an optional `customFields` property.
 *
 * Used to constrain the first parameter of `getCustomFieldValue()` so that
 * only objects with a `customFields` property are accepted.
 */
export interface ExtensibleObject {
  customFields?: Record<string, CustomField> | null;
}

// ############################################################################
// Public types - ExtensibleSchemaName
// ############################################################################

/**
 * The definitive list of base model names that support `customFields` extensions.
 *
 * @todo Add schemas here if they support `customFields` extensions and
 *       map them to Zod schemas in `EXTENSIBLE_SCHEMA_MAP`.
 */
export type ExtensibleSchemaName = "Opportunity";

/**
 * Maps each `ExtensibleSchemaName` to its base Zod schema constant.
 *
 * This is the source of truth for extensible schema type inference.
 * The `PluginSchemas` type derives from `typeof EXTENSIBLE_SCHEMA_MAP` so that
 * the two stay in sync automatically.
 *
 * @todo Keep this map in sync with `ExtensibleSchemaName`.
 *
 * @internal
 */
export const EXTENSIBLE_SCHEMA_MAP = {
  Opportunity: OpportunityBaseSchema,
} as const satisfies Record<ExtensibleSchemaName, HasCustomFields>;

// ############################################################################
// Public types - Transform contract
// ############################################################################

/**
 * Features a plugin can declare in `PluginMeta.capabilities`.
 */
export type PluginCapability = "customFields" | "customFilters" | "transforms";

/**
 * Handler signature for transform mapping handlers.
 *
 * - First arg: the source data being transformed (where field paths resolve from).
 * - Second arg: the handler argument from the mapping spec.
 * - Return: the transformed value.
 *
 * @remarks
 * One contract custom-handler authors should respect:
 *
 * **Do not throw `Error`s whose `.message` embeds source data when that
 * data may contain PII.** `buildTransforms()` wraps a handler exception's
 * message verbatim into the resulting `TransformError.message`, which is
 * enumerable on `Error.prototype` and rendered by `util.inspect` /
 * `console.log(err)`. The SDK does not redact by default —
 * `TransformError.sourceValue` and `.cause` are enumerable, and
 * `.message` flows through verbatim. The built-in `stringToNumber` handler
 * follows this rule by throwing a generic "cannot convert source value to a
 * number" message; see the README's `TransformError` PII warning for the
 * adopter-side redaction pattern.
 */
export type Handler = (data: unknown, arg: unknown) => unknown;

/**
 * Unconditional return shape for `toCommon` / `fromCommon`.
 *
 * `result` is the transformed value (may be partial on handler error or validation
 * failure). `errors` is the aggregated `TransformError` list, empty on full success.
 *
 * Consumers apply their own strict-vs-lenient rule — strict adopters treat any
 * non-empty `errors` as failure; lenient adopters use `result` despite warnings
 * and inspect `errors` for context.
 */
export interface TransformResult<T> {
  result: T;
  errors: TransformError[];
}

/**
 * Structured transformation error.
 *
 * Carries field path, handler name, source value, and underlying cause so
 * consumers can reason about failures programmatically without parsing error text.
 *
 * @remarks
 * **The SDK does not redact by default.**
 * `sourceValue` and `cause` are plain enumerable fields and flow through
 * `JSON.stringify(err)`, `util.inspect(err)`, and any logger that enumerates
 * own properties. When populated by `buildTransforms()`, `sourceValue` is the
 * entire input record passed to `toCommon` / `fromCommon` — not just the
 * value at the failing field — so adopters whose source data may contain PII
 * must redact before logging.
 *
 * Partial-redaction pattern (strips `sourceValue` and `cause` only — see
 * caveat on `message` below):
 * ```ts
 * const partiallySafe = {
 *   name: err.name,
 *   // CAUTION: `message` is data-bearing on the Zod-validation path.
 *   // Strip or transform it before logging if your source data may contain PII.
 *   message: err.message,
 *   path: err.path,
 *   handler: err.handler,
 * };
 * ```
 *
 * `TransformError.message` is data-bearing on the Zod-validation path
 * (`buildTransforms({ commonSchema })`): Zod's default error map embeds the
 * received runtime value into `issue.message`, which flows verbatim into
 * `TransformError.message`. Adopters whose source data may contain PII must redact
 * `message` alongside `sourceValue` and `cause`. Full-message sanitization is
 * tracked under #744.
 */
export class TransformError extends Error {
  /** Dot-notation field path where the error occurred, if known. */
  path?: string;
  /** Name of the handler that raised, if applicable. */
  handler?: string;
  /** The source value that triggered the error (may contain PII — redact before logging). */
  sourceValue?: unknown;
  /** Underlying cause of the error, if any (may contain PII — redact before logging). */
  cause?: unknown;

  constructor(
    message: string,
    options?: {
      path?: string;
      handler?: string;
      sourceValue?: unknown;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "TransformError";
    this.path = options?.path;
    this.handler = options?.handler;
    this.sourceValue = options?.sourceValue;
    this.cause = options?.cause;
  }
}

// ############################################################################
// Public types - SchemaInput (author-provided), SchemaOnly, SchemaWithTransforms
// ############################################################################

/**
 * Author-provided input for a single extensible object, passed inside
 * `DefinePluginOptions.schemas`.
 *
 * Exactly one of `mappings` or explicit callables (`toCommon` / `fromCommon`)
 * may be present — providing both is a compile-time and runtime error.
 *
 * `sourceSchema` is the optional Zod schema for the source system format.
 * `customFields` declares any extra fields this object exposes beyond the base
 * CommonGrants schema; `definePlugin()` applies them via `withCustomFields()`.
 *
 * `commonSchema` is intentionally absent here. It is injected by `definePlugin()`
 * during compilation, resolved from the generated model classes produced by the
 * code generator. Plugin config files cannot import from `generated/` (it is the
 * input to generation).
 *
 * When `mappings` is provided, `definePlugin()` auto-invokes `buildTransforms()`
 * at call time and wraps the result with schema validation against the compiled
 * common schema. When explicit callables are provided, `definePlugin()` wraps them
 * with the same schema validation so both paths give the same runtime guarantee.
 */
export type SchemaInput<TSource = unknown, TCommon = unknown> =
  | {
      sourceSchema?: z.ZodType<TSource>;
      customFields?: Record<string, CustomFieldSpec>;
      mappings: SchemaMappings;
      toCommon?: never;
      fromCommon?: never;
    }
  | {
      sourceSchema?: z.ZodType<TSource>;
      customFields?: Record<string, CustomFieldSpec>;
      mappings?: never;
      toCommon?: (source: TSource) => TransformResult<TCommon>;
      fromCommon?: (common: TCommon) => TransformResult<TSource>;
    };

/**
 * Compiled output for a schema-only entry — no transforms configured.
 *
 * Produced by `definePlugin()` for entries that declare only `customFields`
 * (or nothing at all). The `commonSchema` is the fully extended Zod schema.
 * `customFields` is kept on the entry so consumers can inspect the specs that
 * were used to build it.
 */
export interface SchemaOnly<TCommon> {
  commonSchema: z.ZodType<TCommon>;
  /** Custom field specs that were used to extend the base schema, kept for inspection. */
  customFields?: Record<string, CustomFieldSpec>;
}

/**
 * Compiled output for a schema entry with bidirectional transforms.
 *
 * Produced by `definePlugin()` for entries that declare either `mappings` or
 * explicit `toCommon` / `fromCommon` callables. Both transform directions are
 * always present (non-optional) — `definePlugin()` validates both directions
 * exist before producing this type.
 *
 * `customFields` and `mappings` are kept for consumer inspection: `customFields`
 * shows the specs used to extend the common schema; `mappings` is present when
 * the author used declarative mappings (absent when hand-written functions were used).
 */
export interface SchemaWithTransforms<TSource, TCommon> {
  commonSchema: z.ZodType<TCommon>;
  sourceSchema?: z.ZodType<TSource>;
  /** Custom field specs that were used to extend the base schema, kept for inspection. */
  customFields?: Record<string, CustomFieldSpec>;
  /** Declarative mappings kept for inspection; absent when hand-written functions were used. */
  mappings?: SchemaMappings;
  toCommon: (source: TSource) => TransformResult<TCommon>;
  fromCommon: (common: TCommon) => TransformResult<TSource>;
}

/**
 * Convenience type alias for a `toCommon` transform function.
 *
 * Annotate hand-written transform functions with this type to get full
 * compile-time checking on both the source input and the common output.
 * `TSource` comes from `z.infer<typeof sourceSchema>` and `TCommon` comes
 * from `z.infer<typeof extendedCommonSchema>` (the schema produced by
 * `withCustomFields()` when custom fields are declared).
 *
 * @example
 * ```ts
 * // Without custom fields — TCommon is z.infer<typeof OpportunityBaseSchema>
 * const toCommon: ToCommon<z.infer<typeof SourceSchema>, z.infer<typeof OpportunityBaseSchema>>
 *   = source => ({ result: { ... }, errors: [] });
 *
 * // With custom fields — TCommon is the extended schema type
 * const toCommon: ToCommon<z.infer<typeof SourceSchema>, z.infer<typeof ExtendedSchema>>
 *   = source => ({ result: { ... }, errors: [] });
 * ```
 */
export type ToCommon<TSource, TCommon> = (source: TSource) => TransformResult<TCommon>;

/**
 * Convenience type alias for a `fromCommon` transform function.
 *
 * Annotate hand-written transform functions with this type to get full
 * compile-time checking on both the common input and the source output.
 *
 * @example
 * ```ts
 * const fromCommon: FromCommon<z.infer<typeof SourceSchema>, z.infer<typeof OpportunityBaseSchema>>
 *   = common => ({ result: { ... }, errors: [] });
 * ```
 */
export type FromCommon<TSource, TCommon> = (common: TCommon) => TransformResult<TSource>;

/**
 * Plugin identity and capability declaration.
 *
 * `name` and `sourceSystem` are required so that plugin registries and
 * dependency-injection surfaces always have a reliable display label and
 * provenance string. `version` and `capabilities` remain optional because
 * they can be inferred or omitted during early development.
 */
export interface PluginMeta {
  /** Plugin display name (e.g. `"grants.gov"`). */
  name: string;
  /** Plugin version (semver, e.g. `"1.0.0"`). */
  version?: string;
  /** Name of the source system (e.g. `"grants.gov"`). */
  sourceSystem: string;
  /** Features the plugin provides. */
  capabilities?: PluginCapability[];
}

/**
 * Declarative mapping dicts for a single object.
 *
 * Each direction is author-provided — `buildTransforms()` does not invert one
 * direction into the other, because many-to-one handlers like `switch` are not
 * reversible.
 */
export interface SchemaMappings {
  toCommon?: Record<string, unknown>;
  fromCommon?: Record<string, unknown>;
}
