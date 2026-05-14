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
// Public types - ExtensibleSchemaName, SchemaExtensions
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

/**
 * Maps extensible model names to their custom field specifications.
 *
 * Each key is the name of a model that supports `customFields`, and the value
 * is a record mapping custom field keys to their `CustomFieldSpec` definitions.
 * The `Partial` type is used so plugins only need to declare models they actually extend.
 *
 * @example
 * The following `SchemaExtensions` object:
 *
 * ```typescript
 * const extensions: SchemaExtensions = {
 *   Opportunity: {
 *     legacyId: { name: "Legacy ID", fieldType: "integer" },
 *     category: { name: "Category", fieldType: "string", description: "Grant category" },
 *   },
 * };
 * ```
 * Corresponds to the following customFields object on the Opportunity schema:
 * ```json
 * {
 *   "id": "573525f2-8e15-4405-83fb-e6523511d893",
 *   "title": "Test Opportunity",
 *   "status": { "value": "open" },
 *   "customFields": {
 *     "legacyId": {
 *       "name": "Legacy ID",
 *       "fieldType": "integer",
 *       "value": 12345,
 *     },
 *     "category": {
 *       "name": "Category",
 *       "fieldType": "string",
 *       "value": "Education",
 *       "description": "Grant category",
 *     }
 *   }
 * }
 * ```
 */
export type SchemaExtensions = Partial<
  Record<ExtensibleSchemaName, Record<string, CustomFieldSpec>>
>;

// ############################################################################
// Public types - Transform contract (ADR-0022 §"TypeScript implementation")
// ############################################################################

/**
 * Features a plugin can declare in `PluginMeta.capabilities`.
 */
export type PluginCapability = "customFields" | "customFilters" | "transforms" | "client";

/**
 * Loose configuration object for plugin-provided HTTP clients.
 *
 * Mirrors the Python PoC's `ClientConfig = dict[str, Any]` parity export.
 * The PoC does not constrain client config shape; the full SDK's `client`
 * capability work decides the precise type (tracked alongside the rest of
 * the transforms-bucket follow-ups).
 */
export type ClientConfig = Record<string, unknown>;

/**
 * Handler signature for transform mapping handlers (ADR-0017).
 *
 * - First arg: the source data being transformed (where field paths resolve from).
 * - Second arg: the handler argument from the mapping spec.
 * - Return: the transformed value.
 *
 * @remarks
 * Two contracts custom-handler authors should respect:
 *
 * 1. **Be aware that handler return values can carry prototype-pollution
 *    payloads.** The walker treats handler returns as opaque — it does not
 *    descend into a handler's return value looking for nested `__proto__`
 *    keys. As a defense in depth, `transformFromMapping` does scrub
 *    top-level own `__proto__` keys from object handler returns before
 *    assigning them into the surrounding output shape, so a `const` /
 *    `field` / `match` handler whose return value is a `JSON.parse`-loaded
 *    object with an own `__proto__` key cannot land that key on the
 *    transform result. Built-in handlers can still return objects whose
 *    *nested* values carry such keys; custom handlers that wrap or
 *    construct objects from untrusted input should sanitize their own
 *    output rather than rely on the walker.
 *
 * 2. **Do not throw `Error`s whose `.message` embeds source data when that
 *    data may contain PII.** `buildTransforms()` wraps a handler exception's
 *    message verbatim into the resulting `PluginError.message`, which is
 *    enumerable on `Error.prototype` and rendered by `util.inspect` /
 *    `console.log(err)` (`PluginError.toJSON()` only protects the
 *    non-enumerable `sourceValue` and `cause` fields, and even those are
 *    rendered by Node's default Error inspection — see the README warning).
 *    The built-in `stringToNumber` handler follows this rule by throwing a
 *    generic "cannot convert source value to a number" message.
 */
export type Handler = (data: unknown, arg: unknown) => unknown;

/**
 * Unconditional return shape for `toCommon` / `fromCommon` per ADR-0022 Decision #7.
 *
 * `result` is the transformed value (may be partial on handler error or validation
 * failure). `errors` is the aggregated `PluginError` list, empty on full success.
 *
 * Consumers apply their own strict-vs-lenient rule — strict adopters treat any
 * non-empty `errors` as failure; lenient adopters use `result` despite warnings
 * and inspect `errors` for context.
 */
export interface TransformResult<T> {
  result: T;
  errors: PluginError[];
}

/**
 * Structured transformation error per ADR-0022 Decision #9.
 *
 * Carries field path, handler name, source value, and underlying cause so
 * consumers can reason about failures programmatically without parsing error text.
 *
 * @remarks
 * `sourceValue` may contain PII. When populated by `buildTransforms()` it
 * carries the entire input record passed to `toCommon` / `fromCommon` — not
 * just the value at the failing field. To make the default safer, this class
 * stores `sourceValue` as a non-enumerable own property and overrides
 * `toJSON()` to emit only `name`, `message`, `path`, and `handler`. Both
 * `JSON.stringify(err)` and any structured logger that calls `toJSON` will
 * omit the payload; callers that need the raw value can still read
 * `err.sourceValue` directly.
 *
 * On the Zod-validation path (`buildTransforms({ commonModel })`), `message`
 * is also data-bearing: Zod's default error map embeds the received runtime
 * value into `issue.message` (e.g. `invalid_enum_value` echoes the received
 * value), and that string flows directly into `PluginError.message` here.
 * Adopters whose source data may contain PII should sanitize `err.message`
 * alongside `err.sourceValue` before logging.
 */
export class PluginError extends Error {
  /** Dot-notation field path where the error occurred, if known. */
  path?: string;
  /** Name of the handler that raised, if applicable. */
  handler?: string;
  /** The source value that triggered the error (may contain PII — redact before logging). */
  sourceValue?: unknown;
  /** Underlying cause of the error, if any. */
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
    this.name = "PluginError";
    this.path = options?.path;
    this.handler = options?.handler;
    // Store PII-bearing fields as non-enumerable so `JSON.stringify` and any
    // logger that enumerates own properties omit them by default. Callers can
    // still read them directly via `err.sourceValue` / `err.cause`.
    Object.defineProperty(this, "sourceValue", {
      value: options?.sourceValue,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, "cause", {
      value: options?.cause,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }

  /**
   * Serialization for `JSON.stringify` and structured loggers. Omits
   * `sourceValue` and `cause` so PII does not leak through the default
   * serialization path. Callers that need the raw payload should read the
   * fields directly.
   */
  toJSON(): { name: string; message: string; path?: string; handler?: string } {
    return {
      name: this.name,
      message: this.message,
      path: this.path,
      handler: this.handler,
    };
  }
}

/**
 * Input type provided by plugin authors inside `DefinePluginOptions.transformSchemas`.
 *
 * Plugin authors supply `toCommon` and `fromCommon` as plain callables — either
 * hand-written or generated via `buildTransforms()`. `native` is the optional Zod
 * schema for the source format.
 *
 * @remarks
 * `common` is intentionally absent here. It is injected by `definePlugin()`
 * during compilation from `ObjectSchemasInput` → `ObjectSchemas`, resolved from
 * the generated model classes produced by the code generator. Plugin config
 * files cannot import from `generated/` (which is the input to generation).
 */
export interface ObjectSchemasInput<TNative = unknown, TCommon = unknown> {
  native?: z.ZodType<TNative>;
  toCommon?: (native: TNative) => TransformResult<TCommon>;
  fromCommon?: (common: TCommon) => TransformResult<TNative>;
}

/**
 * Runtime compiled type produced by `definePlugin()` — not provided directly by authors.
 *
 * In the PoC, `definePlugin()` stores `ObjectSchemasInput` as-is on the returned
 * plugin's `transformSchemas` field. Full compilation (adding `common` from the
 * base CG model, wrapping with Zod validation) is deferred to the full SDK
 * (ADR-0022 Decision #7, tracked under #756).
 */
export interface ObjectSchemas<TNative, TCommon> {
  native: z.ZodType<TNative>;
  common: z.ZodType<TCommon>;
  toCommon: (native: TNative) => TransformResult<TCommon>;
  fromCommon: (common: TCommon) => TransformResult<TNative>;
}

/**
 * Plugin identity and capability declaration. All fields are optional.
 */
export interface PluginMeta {
  /** Plugin display name (e.g. `"grants.gov"`). */
  name?: string;
  /** Plugin version (semver, e.g. `"1.0.0"`). */
  version?: string;
  /** Name of the native source system (e.g. `"grants.gov"`). */
  sourceSystem?: string;
  /** Features the plugin provides. */
  capabilities?: PluginCapability[];
}

/**
 * ADR-0017 mapping dicts for a single object, stored in the serializable
 * extensions config (ADR-0022 Decision #6).
 *
 * Each direction is author-provided — `buildTransforms()` does not invert one
 * direction into the other, because many-to-one handlers like `switch` are not
 * reversible.
 */
export interface ObjectMappings {
  toCommon?: Record<string, unknown>;
  fromCommon?: Record<string, unknown>;
}

/**
 * Per-object config inside the serializable `PluginExtensions.schemas` dict.
 *
 * `customFields` carries declarations merged by `mergeExtensions()`. `mappings`
 * carries optional ADR-0017 declarative mappings; when present and no explicit
 * `toCommon` / `fromCommon` is supplied in `DefinePluginOptions.transformSchemas`,
 * `definePlugin()` will auto-invoke `buildTransforms()` on these. Deferred to
 * the full SDK (ADR-0022 Decision #6, tracked under #756).
 */
export interface PluginExtensionsObjectConfig {
  customFields?: Record<string, CustomFieldSpec>;
  mappings?: ObjectMappings;
}

/**
 * Serializable portion of plugin config — safe to store as JSON.
 *
 * Used by `mergeExtensions()` to combine declarations from multiple plugin packages.
 */
export interface PluginExtensions {
  meta?: PluginMeta;
  schemas?: Partial<Record<ExtensibleSchemaName, PluginExtensionsObjectConfig>>;
}
