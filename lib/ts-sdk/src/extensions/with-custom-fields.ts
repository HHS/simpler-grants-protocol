/**
 * Custom Fields Extension
 *
 * Provides the withCustomFields() function for extending CommonGrants schemas
 * with typed custom fields.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomField, CustomFieldType } from "../types";
import { CustomFieldSchema } from "../schemas";
import type { CustomFieldSpec } from "./types";

// ############################################################################
// Public type - WithCustomFieldsResult
// ############################################################################

/**
 * The return type of `withCustomFields()` - a Zod schema with typed customFields.
 *
 * This type:
 * 1. Takes the base schema's shape and removes the original `customFields` property
 * 2. Adds a new `customFields` property typed using `TypedCustomFields<TSpecs>`
 * 3. Wraps it in `z.ZodObject` to maintain Zod schema compatibility
 *
 * The result is that `z.infer<WithCustomFieldsResult<...>>` produces a type where:
 * - All base schema properties remain unchanged
 * - `customFields` is optional (via `ZodOptional`)
 * - Registered custom fields have strongly-typed `value` properties
 * - Unregistered fields pass through with base `CustomField` type
 *
 * @example
 * ```typescript
 * const Schema = withCustomFields(OpportunityBaseSchema, {
 *   legacyId: { fieldType: "object", value: ... }
 * } as const);
 *
 * type Opportunity = z.infer<typeof Schema>;
 * // Opportunity.customFields?.legacyId?.value.id → typed as number ✅
 * ```
 */
export type WithCustomFieldsResult<
  TSchema extends z.AnyZodObject,
  TSpecs extends Record<string, CustomFieldSpec>,
> = z.ZodObject<
  Omit<TSchema["shape"], "customFields"> & {
    customFields: z.ZodOptional<z.ZodType<TypedCustomFields<TSpecs>>>;
  }
>;

// ############################################################################
// Public function - withCustomFields()
// ############################################################################

/**
 * Extends a schema with typed custom fields.
 *
 * This function takes a base schema (like OpportunityBaseSchema) and a Record
 * of custom field specifications keyed by field name, returning a new schema
 * where the customFields property is typed according to the specs. The record
 * key is used as the default for each CustomField's `name`; spec.description
 * is used as the default for CustomField.description when present.
 *
 * Unregistered custom fields will still pass through validation but won't have
 * typed access.
 *
 * @param baseSchema - The base Zod object schema to extend
 * @param specs - Record of custom field specifications (key = field name)
 * @returns A new schema with typed customFields
 *
 * @example
 * ```typescript
 * const LegacyIdValueSchema = z.object({
 *   system: z.string(),
 *   id: z.number().int(),
 * });
 *
 * const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
 *   legacyId: {
 *     fieldType: "object",
 *     value: LegacyIdValueSchema,
 *     description: "Maps to the opportunity_id in the legacy system",
 *   },
 *   category: {
 *     fieldType: "string",
 *     description: "Grant category",
 *   },
 * } as const);
 *
 * type Opportunity = z.infer<typeof OpportunitySchema>;
 * // opp.customFields?.legacyId?.value.id   → typed as number
 * // opp.customFields?.category?.value      → typed as string
 * ```
 */
export function withCustomFields<
  TSchema extends z.AnyZodObject,
  const TSpecs extends Record<string, CustomFieldSpec>,
>(baseSchema: TSchema, specs: TSpecs): WithCustomFieldsResult<TSchema, TSpecs> {
  // Validate that the base schema has a customFields property
  const schemaShape = baseSchema.shape;
  if (!("customFields" in schemaShape)) {
    throw new Error(
      "Cannot register custom fields on a schema that doesn't support them. " +
        "The base schema must include a 'customFields' property (e.g., customFields: z.record(z.unknown()).nullish())"
    );
  }

  // Build typed schema for each spec; record key is the field name
  const typedFieldSchemas: Record<string, z.ZodTypeAny> = {};

  for (const [key, spec] of Object.entries(specs)) {
    typedFieldSchemas[key] = CustomFieldSchema.extend({
      fieldType: z.literal(spec.fieldType),
      value: getValueSchema(spec),
      name: z.string().default(spec.name ?? key),
      description:
        spec.description !== undefined
          ? z.string().nullish().default(spec.description)
          : z.string().nullish(),
    }).optional();
  }

  // Create new customFields schema with passthrough for unknown fields
  // Use nullish() to match the base schema's customFields: z.record(...).nullish()
  const customFieldsSchema = z.object(typedFieldSchemas).passthrough().nullish();

  // Extend base schema with new customFields
  const result = baseSchema.extend({
    customFields: customFieldsSchema,
  });

  return result as unknown as WithCustomFieldsResult<TSchema, TSpecs>;
}

// ############################################################################
// Internal - Default value schemas
// ############################################################################

/**
 * Default Zod schemas for each CustomFieldType.
 * Used when a value schema is not provided in a CustomFieldSpec.
 */
const DEFAULT_VALUE_SCHEMAS: Record<CustomFieldType, z.ZodTypeAny> = {
  string: z.string(),
  number: z.number(),
  integer: z.number().int(),
  boolean: z.boolean(),
  object: z.record(z.unknown()),
  array: z.array(z.unknown()),
};

/**
 * Gets the value schema for a custom field spec.
 * Returns the provided value schema or a default based on fieldType.
 */
function getValueSchema(spec: CustomFieldSpec): z.ZodTypeAny {
  return spec.value ?? DEFAULT_VALUE_SCHEMAS[spec.fieldType];
}

// ############################################################################
// Internal - Type inference utilities
// ############################################################################

/**
 * WHY THESE UTILITIES EXIST:
 *
 * The `withCustomFields()` function builds Zod schemas dynamically at runtime by
 * iterating over `Object.entries(specs)`. However, TypeScript's type system
 * operates at compile time and cannot "unroll" runtime loops to infer types.
 *
 * When we do:
 *   const schemas = {};
 *   for (const [name, spec] of Object.entries(specs)) { schemas[name] = ... }
 *
 * TypeScript only sees `Record<string, z.ZodTypeAny>`, losing all specific
 * key-value type information.
 *
 * These type utilities bridge that gap by operating at the TYPE level instead
 * of the VALUE level. They use TypeScript's mapped types over the Record's
 * keys at compile time, reconstructing what the inferred type should be.
 */

/**
 * Maps each CustomFieldType value to its corresponding default TypeScript type.
 *
 * This is used when a CustomFieldSpec doesn't provide a `value` schema. Instead
 * of using `z.unknown()`, we infer a more specific type based on the fieldType.
 *
 * Example:
 *   - fieldType: "string" → value type: string
 *   - fieldType: "number" → value type: number
 *   - fieldType: "object" → value type: Record<string, unknown>
 *
 * Note: This map must include all values from the CustomFieldType union.
 * If a new field type is added to CustomFieldTypeEnum, this map must be updated.
 */
type DefaultFieldTypeMap = {
  string: string;
  number: number;
  integer: number;
  boolean: boolean;
  object: Record<string, unknown>;
  array: unknown[];
};

/**
 * Infers the TypeScript type for a custom field's `value` property.
 *
 * This conditional type works in two steps:
 * 1. If the spec provides a `value` schema, use `z.infer<>` to get its TypeScript type
 * 2. Otherwise, look up the default type from `DefaultFieldTypeMap` based on `fieldType`
 *
 * @example
 * ```typescript
 * // With value schema:
 * type T1 = InferValueType<{ fieldType: "object", value: z.object({ id: z.number() }) }>;
 * // T1 = { id: number }
 *
 * // Without value schema (uses default):
 * type T2 = InferValueType<{ fieldType: "string" }>;
 * // T2 = string
 * ```
 */
/** Infers the value type from a spec's explicit value schema, if one is provided. */
type InferFromValueSchema<T extends CustomFieldSpec> = T["value"] extends z.ZodTypeAny
  ? z.infer<T["value"]>
  : never;

/** Falls back to DefaultFieldTypeMap based on fieldType. */
type DefaultValueType<T extends CustomFieldSpec> = T["fieldType"] extends keyof DefaultFieldTypeMap
  ? DefaultFieldTypeMap[T["fieldType"]]
  : unknown;

/** Composes the two helpers: use explicit schema if available, else default. */
type InferValueType<T extends CustomFieldSpec> = T["value"] extends z.ZodTypeAny
  ? InferFromValueSchema<T>
  : DefaultValueType<T>;

/**
 * Builds the complete TypeScript type for a single custom field object.
 *
 * This represents what a registered custom field looks like at runtime:
 * {
 *   name: string;
 *   fieldType: "string" | "number" | ... (literal type from spec);
 *   value: <inferred from value schema or DefaultFieldTypeMap>;
 *   schema?: string | null;
 *   description?: string | null;
 * }
 *
 * @example
 * ```typescript
 * type Field = TypedCustomField<{
 *   fieldType: "object",
 *   value: z.object({ system: z.string(), id: z.number() })
 * }>;
 * // Field = {
 * //   name: string;
 * //   fieldType: "object";
 * //   value: { system: string; id: number };
 * //   schema?: string | null;
 * //   description?: string | null;
 * // }
 * ```
 */
type TypedCustomField<T extends CustomFieldSpec> = {
  name: string;
  fieldType: T["fieldType"];
  value: InferValueType<T>;
  schema?: string | null;
  description?: string | null;
};

/**
 * Builds the complete `customFields` object type from a Record of specs.
 *
 * This is the core type transformation that makes `withCustomFields()` work.
 * It does two things:
 *
 * 1. **Mapped type iteration**: `[K in keyof TSpecs]` iterates over each key
 *    in the specs Record at the TYPE level, creating a typed property for it
 *    using the spec value type at TSpecs[K].
 *
 * 2. **Passthrough for unknown fields**: `& Record<string, CustomField>` ensures
 *    that unregistered custom fields (not in the specs Record) can still pass
 *    through validation, but they'll be typed as the base `CustomField` type
 *    (with `value: unknown`).
 *
 * @example
 * ```typescript
 * type Fields = TypedCustomFields<{
 *   legacyId: { fieldType: "object", value: ... },
 *   category: { fieldType: "string" }
 * }>;
 * // Fields = {
 * //   legacyId?: { fieldType: "object", value: { system: string; id: number }, ... };
 * //   category?: { fieldType: "string", value: string, ... };
 * // } & Record<string, CustomField>
 * ```
 *
 * This allows:
 *   - `fields.legacyId?.value.id` → typed as `number` ✅
 *   - `fields.category?.value` → typed as `string` ✅
 *   - `fields.unknownField?.value` → typed as `unknown` (passthrough)
 */
type TypedCustomFields<TSpecs extends Record<string, CustomFieldSpec>> = {
  [K in keyof TSpecs]?: TypedCustomField<TSpecs[K]>;
} & Record<string, CustomField>;
