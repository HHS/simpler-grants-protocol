/**
 * Custom Field Value Extraction
 *
 * Provides utilities for safely extracting and parsing custom field values
 * from customFields objects.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { ExtensibleObject } from "./types";

// ############################################################################
// Public function - getCustomFieldValue()
// ############################################################################

/**
 * Extracts and parses a custom field value from an object with `customFields`.
 *
 * 1. If the field is present and matches the key, returns the typed `value`
 * 2. If the field is present but the value doesn't match the schema, throws a ZodError
 * 3. If the field is present but the value is null or undefined, returns undefined
 * 4. If the field or `customFields` is NOT present, returns undefined
 *
 * @param obj - An object with a `customFields` property (may be null or undefined)
 * @param key - The key of the custom field to extract
 * @param valueSchema - Zod schema to parse and validate the value
 * @returns The parsed value if the field exists and is valid, otherwise `undefined`
 * @throws {ZodError} If the field exists with a non-null value that doesn't match the provided schema
 *
 * @example
 * ```typescript
 * const LegacyIdValueSchema = z.object({
 *   system: z.string(),
 *   id: z.number().int(),
 * });
 *
 * const opp = {
 *   id: "573525f2-8e15-4405-83fb-e6523511d893",
 *   title: "Test Opportunity",
 *   customFields: {
 *     legacyId: {
 *       name: "legacyId",
 *       fieldType: "object",
 *       value: { system: "legacy", id: 12345 },
 *     },
 *   },
 * };
 *
 * const legacy = getCustomFieldValue(opp, "legacyId", LegacyIdValueSchema);
 * // legacy: { system: string; id: number } | undefined
 * console.log(legacy?.id); // 12345
 *
 * // If value is invalid (but not null/undefined), throws ZodError
 * const invalid = {
 *   id: "573525f2-8e15-4405-83fb-e6523511d893",
 *   title: "Test Opportunity",
 *   customFields: {
 *     legacyId: {
 *       name: "legacyId",
 *       fieldType: "object",
 *       value: { system: "legacy", id: "not-a-number" }, // Invalid!
 *     },
 *   },
 * };
 * getCustomFieldValue(invalid, "legacyId", LegacyIdValueSchema); // throws ZodError
 * ```
 */
export function getCustomFieldValue<T extends z.ZodTypeAny>(
  obj: ExtensibleObject,
  key: string,
  valueSchema: T
): z.infer<T> | undefined {
  // Return undefined if customFields doesn't exist
  const customFields = obj.customFields;
  if (!customFields) {
    return undefined;
  }

  // Return undefined if the key doesn't exist
  const field = customFields[key];
  if (!field) {
    return undefined;
  }

  // Extract the value property
  const value = field.value;

  // Return undefined if the value is null or undefined
  if (value == null) {
    return undefined;
  }

  // Parse and validate using the provided schema
  // This will throw a ZodError if validation fails
  return valueSchema.parse(value);
}
