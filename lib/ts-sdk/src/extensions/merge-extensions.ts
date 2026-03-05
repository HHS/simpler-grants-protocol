/**
 * Provides the `mergeExtensions()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import type {
  SchemaExtensions,
  ExtensibleSchemaName,
  CustomFieldSpec,
  MergeExtensionsOptions,
} from "./types";

/**
 * Merges multiple `SchemaExtensions` objects into a single combined result.
 *
 * @param sources - Array of `SchemaExtensions` to merge
 * @param options - Conflict resolution options
 * @returns A single merged `SchemaExtensions` object
 * @throws Error if duplicate field names are found and `onConflict` is `"error"`
 *
 * @example
 * ```typescript
 * const merged = mergeExtensions([
 *   { Opportunity: { legacyId: { fieldType: "string" } } },
 *   { Opportunity: { category: { fieldType: "string" } } },
 * ]);
 * // merged.Opportunity has both legacyId and category
 * ```
 */
export function mergeExtensions(
  sources: SchemaExtensions[],
  options: MergeExtensionsOptions = {}
): SchemaExtensions {
  if (sources.length === 0) return {};
  if (sources.length === 1) return sources[0];

  const { onConflict = "error" } = options;
  const result: Record<string, Record<string, CustomFieldSpec>> = {};

  for (const source of sources) {
    for (const [model, fields] of Object.entries(source) as [
      ExtensibleSchemaName,
      Record<string, CustomFieldSpec>,
    ][]) {
      if (!result[model]) {
        result[model] = {};
      }

      for (const [fieldName, spec] of Object.entries(fields)) {
        if (fieldName in result[model]) {
          switch (onConflict) {
            case "error":
              throw new Error(
                `mergeExtensions: duplicate field "${fieldName}" on model "${model}"`
              );
            case "firstWins":
              // Keep existing — do nothing
              break;
            case "lastWins":
              result[model][fieldName] = spec;
              break;
          }
        } else {
          result[model][fieldName] = spec;
        }
      }
    }
  }

  return result as SchemaExtensions;
}
