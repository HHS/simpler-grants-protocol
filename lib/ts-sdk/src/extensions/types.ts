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
 * Maps CustomFieldType to its default TypeScript type.
 * Used for inferring value types when no valueSchema is provided.
 * Keys are constrained to match all values in the CustomFieldType union.
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
 * Infers the value type from a CustomFieldSpec.
 * Uses the valueSchema if provided, otherwise derives from fieldType.
 */
type InferValueType<T extends CustomFieldSpec> = T["valueSchema"] extends z.ZodTypeAny
  ? z.infer<T["valueSchema"]>
  : T["fieldType"] extends keyof DefaultFieldTypeMap
    ? DefaultFieldTypeMap[T["fieldType"]]
    : unknown;

/**
 * Builds the typed custom field object type for a single spec.
 */
type TypedCustomField<T extends CustomFieldSpec> = {
  name: string;
  fieldType: T["fieldType"];
  value: InferValueType<T>;
  schema?: string | null;
  description?: string | null;
};

/**
 * Builds the customFields object type from an array of specs.
 * Known fields get typed access, unknown fields pass through with base CustomField type.
 */
type TypedCustomFields<TSpecs extends readonly CustomFieldSpec[]> = {
  [K in TSpecs[number] as K["key"]]?: TypedCustomField<K>;
} & Record<string, CustomField>;

// ############################################################################
// WithCustomFieldsResult
// ############################################################################

/**
 * Result type for withCustomFields - extends base schema with typed customFields.
 */
export type WithCustomFieldsResult<
  TSchema extends z.AnyZodObject,
  TSpecs extends readonly CustomFieldSpec[],
> = z.ZodObject<
  Omit<TSchema["shape"], "customFields"> & {
    customFields: z.ZodOptional<z.ZodType<TypedCustomFields<TSpecs>>>;
  }
>;
