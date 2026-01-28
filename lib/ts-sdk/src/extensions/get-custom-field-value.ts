/**
 * Custom Field Value Extraction
 *
 * Provides utilities for safely extracting and parsing custom field values
 * from customFields objects.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import type { CustomField } from "../types";

/**
 * Extracts and parses a custom field value from a customFields object,
 *
 * 1. If the field is present and matches the key, returns the typed `value`
 * 2. If the field is present but the value doesn't match the schema, throws a ZodError
 * 3. If the field is present but the value is null or undefined, returns undefined
 * 4. If the field is NOT present, returns undefined
 *
 * @param customFields - The customFields object (may be null, undefined, or a record)
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
 *   customFields: {
 *     legacyId: {
 *       name: "legacyId",
 *       fieldType: "object",
 *       value: { system: "legacy", id: 12345 },
 *     },
 *   },
 * };
 *
 * const legacy = getCustomFieldValue(
 *   opp.customFields,
 *   "legacyId",
 *   LegacyIdValueSchema
 * );
 * // legacy: { system: string; id: number } | undefined
 * console.log(legacy?.id); // 12345
 *
 * // If value is invalid (but not null/undefined), throws ZodError
 * const invalid = {
 *   customFields: {
 *     legacyId: {
 *       name: "legacyId",
 *       fieldType: "object",
 *       value: { system: "legacy", id: "not-a-number" }, // Invalid!
 *     },
 *   },
 * };
 * getCustomFieldValue(invalid.customFields, "legacyId", LegacyIdValueSchema); // throws ZodError
 * ```
 */
export function getCustomFieldValue<T extends z.ZodTypeAny>(
  customFields: Record<string, CustomField> | null | undefined,
  key: string,
  valueSchema: T
): z.infer<T> | undefined {
  // Return undefined if customFields doesn't exist
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
