/**
 * Shared foundation types for the extensions module.
 *
 * Only types referenced by multiple files live here. Types specific to a
 * single utility function are co-located with that function.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomFieldType } from "../types";

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
  valueSchema?: z.ZodTypeAny;
  /** Optional description; used as the default for CustomField.description when present */
  description?: string;
}

// ############################################################################
// Public types - ExtensibleSchemaName, SchemaExtensions
// ############################################################################

/**
 * The definitive list of base model names that support `customFields` extensions.
 *
 * @todo Add schemas here if they support `customFields` extensions and
 *       map them to Zod schemas in `BASE_SCHEMAS` in `define-plugin.ts`.
 */
export type ExtensibleSchemaName = "Opportunity";

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
