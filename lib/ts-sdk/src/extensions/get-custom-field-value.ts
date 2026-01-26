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
 * Safely extracts and parses a custom field value from a customFields object.
 *
 * This function:
 * 1. Checks if the customFields object exists and contains the specified key
 * 2. Extracts the `value` property from the custom field
 * 3. Parses and validates it using the provided Zod schema
 * 4. Returns the parsed value, or `undefined` if the field doesn't exist or parsing fails
 *
 * @param customFields - The customFields object (may be null, undefined, or a record)
 * @param key - The key of the custom field to extract
 * @param valueSchema - Zod schema to parse and validate the value
 * @returns The parsed value if the field exists and is valid, otherwise `undefined`
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

  // Parse and validate using the provided schema
  // Use safeParse to avoid throwing errors
  const result = valueSchema.safeParse(value);

  // Return the parsed value if valid, otherwise undefined
  return result.success ? result.data : undefined;
}
