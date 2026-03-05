/**
 * Provides the `mergeExtensions()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import type { SchemaExtensions, ExtensibleSchemaName, CustomFieldSpec } from "./types";

// ############################################################################
// Public type - MergeExtensionsOptions
// ############################################################################

/**
 * Options for controlling how field-name conflicts are resolved
 * when merging multiple `SchemaExtensions` sources.
 */
export interface MergeExtensionsOptions {
  /**
   * Strategy for handling duplicate field names within the same model.
   *
   * - `"error"` (default) — throw an error on conflict
   * - `"firstWins"` — keep the first definition encountered
   * - `"lastWins"` — use the last definition encountered
   */
  onConflict?: "error" | "firstWins" | "lastWins";
}

// ############################################################################
// Public function - mergeExtensions()
// ############################################################################

/**
 * Merges multiple `SchemaExtensions` objects into a single combined result.
 *
 * When using the default `"error"` conflict strategy (or no options), the
 * return type preserves the specific field names and specs from each source
 * via TypeScript intersection types. This enables fully typed `customFields`
 * access after passing the result to `definePlugin()`.
 *
 * When using `"firstWins"` or `"lastWins"`, the return type falls back to
 * `SchemaExtensions` because conflict resolution makes static typing
 * unreliable for overlapping field names.
 *
 * @param sources - Array of `SchemaExtensions` to merge
 * @param options - Conflict resolution options
 * @returns A single merged `SchemaExtensions` object
 * @throws Error if duplicate field names are found and `onConflict` is `"error"`
 *
 * @example
 * ```typescript
 * const merged = mergeExtensions([
 *   legacyPlugin.extensions,
 *   classificationPlugin.extensions,
 * ]);
 * // merged preserves both plugins' field types
 * const combined = definePlugin({ extensions: merged });
 * // combined.schemas.Opportunity has typed customFields for all fields
 * ```
 */
export function mergeExtensions<const T extends readonly SchemaExtensions[]>(
  sources: [...T],
  options?: { onConflict?: "error" }
): MergedSchemaExtensions<T>;

export function mergeExtensions(
  sources: SchemaExtensions[],
  options: MergeExtensionsOptions
): SchemaExtensions;

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

// ############################################################################
// Internal type-level merge utilities
// ############################################################################

/** Converts a union type to an intersection type. */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Extracts the field specs for a given model from a single `SchemaExtensions`
 * source. Uses `keyof` + `NonNullable` so that `Partial` keys are handled
 * correctly (the optional `undefined` is stripped).
 *
 * Distributes over union types when `S` = `T[number]`, so each tuple element
 * contributes its own fields independently.
 */
type ExtractModelFields<S, K extends string> = K extends keyof S ? NonNullable<S[K]> : never;

/**
 * Computes the merged `SchemaExtensions` type from a tuple of sources.
 *
 * For each extensible model, intersects the field-spec records from every
 * source. When sources declare disjoint fields the intersection simply
 * combines them; when they declare the same field name (a conflict) the
 * runtime `onConflict: "error"` strategy throws, so the intersection is
 * still sound — both definitions would need to agree at the type level.
 */
export type MergedSchemaExtensions<T extends readonly SchemaExtensions[]> = {
  [K in ExtensibleSchemaName]: UnionToIntersection<ExtractModelFields<T[number], K>>;
};
