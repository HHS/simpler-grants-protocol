/**
 * Type definitions for the extensions module.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomField, CustomFieldType } from "../types";

// ############################################################################
// CustomFieldSpec
// ############################################################################

/**
 * Specification for a custom field to be registered on a schema.
 */
export interface CustomFieldSpec {
  /** The key used in the customFields record */
  key: string;
  /** The JSON schema type for the field */
  fieldType: CustomFieldType;
  /** Optional Zod schema to validate the value property. Defaults based on fieldType */
  valueSchema?: z.ZodTypeAny;
  /** Optional description of the custom field */
  description?: string;
}

// ############################################################################
// Internal Type Inference Utilities
// ############################################################################

/**
 * WHY THESE UTILITIES EXIST:
 *
 * The `withCustomFields()` function builds Zod schemas dynamically at runtime by
 * looping over a `specs` array. However, TypeScript's type system operates at
 * compile time and cannot "unroll" runtime loops to infer types.
 *
 * When we do:
 *   const schemas = {};
 *   for (const spec of specs) { schemas[spec.key] = ... }
 *
 * TypeScript only sees `Record<string, z.ZodTypeAny>`, losing all specific
 * key-value type information.
 *
 * These type utilities bridge that gap by operating at the TYPE level instead
 * of the VALUE level. They use TypeScript's mapped types to iterate over the
 * `specs` array type at compile time, reconstructing what the inferred type
 * should be.
 */

/**
 * Maps each CustomFieldType value to its corresponding default TypeScript type.
 *
 * This is used when a CustomFieldSpec doesn't provide a `valueSchema`. Instead
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
 * 1. If the spec provides a `valueSchema`, use `z.infer<>` to get its TypeScript type
 * 2. Otherwise, look up the default type from `DefaultFieldTypeMap` based on `fieldType`
 *
 * @example
 * ```typescript
 * // With valueSchema:
 * type T1 = InferValueType<{ fieldType: "object", valueSchema: z.object({ id: z.number() }) }>;
 * // T1 = { id: number }
 *
 * // Without valueSchema (uses default):
 * type T2 = InferValueType<{ fieldType: "string" }>;
 * // T2 = string
 * ```
 */
type InferValueType<T extends CustomFieldSpec> = T["valueSchema"] extends z.ZodTypeAny
  ? z.infer<T["valueSchema"]>
  : T["fieldType"] extends keyof DefaultFieldTypeMap
    ? DefaultFieldTypeMap[T["fieldType"]]
    : unknown;

/**
 * Builds the complete TypeScript type for a single custom field object.
 *
 * This represents what a registered custom field looks like at runtime:
 * {
 *   name: string;
 *   fieldType: "string" | "number" | ... (literal type from spec);
 *   value: <inferred from valueSchema or DefaultFieldTypeMap>;
 *   schema?: string | null;
 *   description?: string | null;
 * }
 *
 * @example
 * ```typescript
 * type Field = TypedCustomField<{
 *   key: "legacyId",
 *   fieldType: "object",
 *   valueSchema: z.object({ system: z.string(), id: z.number() })
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
 * Builds the complete `customFields` object type from an array of specs.
 *
 * This is the core type transformation that makes `withCustomFields()` work.
 * It does two things:
 *
 * 1. **Mapped type iteration**: `[K in TSpecs[number] as K["key"]]` iterates
 *    over each spec in the array at the TYPE level, extracting the `key` from
 *    each spec and creating a typed property for it.
 *
 * 2. **Passthrough for unknown fields**: `& Record<string, CustomField>` ensures
 *    that unregistered custom fields (not in the specs array) can still pass
 *    through validation, but they'll be typed as the base `CustomField` type
 *    (with `value: unknown`).
 *
 * @example
 * ```typescript
 * type Fields = TypedCustomFields<[
 *   { key: "legacyId", fieldType: "object", valueSchema: ... },
 *   { key: "category", fieldType: "string" }
 * ]>;
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
type TypedCustomFields<TSpecs extends readonly CustomFieldSpec[]> = {
  [K in TSpecs[number] as K["key"]]?: TypedCustomField<K>;
} & Record<string, CustomField>;

// ############################################################################
// WithCustomFieldsResult
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
 * const Schema = withCustomFields(OpportunityBaseSchema, [
 *   { key: "legacyId", fieldType: "object", valueSchema: ... }
 * ] as const);
 *
 * type Opportunity = z.infer<typeof Schema>;
 * // Opportunity.customFields?.legacyId?.value.id → typed as number ✅
 * ```
 */
export type WithCustomFieldsResult<
  TSchema extends z.AnyZodObject,
  TSpecs extends readonly CustomFieldSpec[],
> = z.ZodObject<
  Omit<TSchema["shape"], "customFields"> & {
    customFields: z.ZodOptional<z.ZodType<TypedCustomFields<TSpecs>>>;
  }
>;
