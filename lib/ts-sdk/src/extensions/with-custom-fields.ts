/**
 * Custom Fields Extension
 *
 * Provides the withCustomFields() function for extending CommonGrants schemas
 * with typed custom fields.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomFieldType } from "../types";
import { CustomFieldSchema } from "../schemas";
import type { CustomFieldSpec, WithCustomFieldsResult } from "./types";

// ############################################################################
// Default Value Schemas
// ############################################################################

/**
 * Default Zod schemas for each CustomFieldType.
 * Used when valueSchema is not provided in a CustomFieldSpec.
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
 * Returns the provided valueSchema or a default based on fieldType.
 */
function getValueSchema(spec: CustomFieldSpec): z.ZodTypeAny {
  return spec.valueSchema ?? DEFAULT_VALUE_SCHEMAS[spec.fieldType];
}

// ############################################################################
// Main Function
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
 *     valueSchema: LegacyIdValueSchema,
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
