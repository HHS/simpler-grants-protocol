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
   *
   * @remarks
   * WARNING: Using `"firstWins"` or `"lastWins"` causes the return type to fall back to
   * `SchemaExtensions`, losing specific field-level type inference. If you publish
   * a package that calls `mergeExtensions()` with one of these strategies, the
   * widened type will propagate to your consumers. Prefer the default `"error"`
   * strategy in published plugins to preserve full type safety for downstream users.
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
// Overload: when onConflict is "error" (the default) - preserve specific field types
export function mergeExtensions<const T extends readonly SchemaExtensions[]>(
  sources: [...T],
  options?: { onConflict?: "error" }
): MergedSchemaExtensions<T>;

/**
 * Overload for `"firstWins"` or `"lastWins"` conflict strategies.
 *
 * @remarks
 * WARNING: Using `"firstWins"` or `"lastWins"` causes the return type to fall back to
 * `SchemaExtensions`, losing specific field-level type inference. If you publish
 * a package that calls `mergeExtensions()` with one of these strategies, the
 * widened type will propagate to your consumers. Prefer the default `"error"`
 * strategy in published plugins to preserve full type safety for downstream users.
 */
export function mergeExtensions(
  sources: SchemaExtensions[],
  options: MergeExtensionsOptions
): SchemaExtensions;

// Implementation signature — not visible to callers.
export function mergeExtensions(
  sources: SchemaExtensions[],
  options: MergeExtensionsOptions = {}
): SchemaExtensions {
  if (sources.length === 0) return {};
  if (sources.length === 1) return sources[0];

  const { onConflict = "error" } = options;
  const result: Record<string, Record<string, CustomFieldSpec>> = {};

  for (const source of sources) {
    mergeSource(result, source, onConflict);
  }

  return result as SchemaExtensions;
}

// ############################################################################
// Internal functions - mergeSource(), mergeFields()
// ############################################################################

/** Merges all models from a single source into the accumulated result. */
function mergeSource(
  result: Record<string, Record<string, CustomFieldSpec>>,
  source: SchemaExtensions,
  onConflict: NonNullable<MergeExtensionsOptions["onConflict"]>
): void {
  for (const [model, fields] of Object.entries(source) as [
    ExtensibleSchemaName,
    Record<string, CustomFieldSpec>,
  ][]) {
    result[model] ??= {};
    mergeFields(result[model], fields, model, onConflict);
  }
}

/** Merges fields from a single model into the target, applying conflict resolution. */
function mergeFields(
  target: Record<string, CustomFieldSpec>,
  source: Record<string, CustomFieldSpec>,
  model: string,
  onConflict: NonNullable<MergeExtensionsOptions["onConflict"]>
): void {
  for (const [fieldName, spec] of Object.entries(source)) {
    if (fieldName in target) {
      switch (onConflict) {
        case "error":
          throw new Error(`mergeExtensions: duplicate field "${fieldName}" on model "${model}"`);
        case "firstWins":
          break;
        case "lastWins":
          target[fieldName] = spec;
          break;
      }
    } else {
      target[fieldName] = spec;
    }
  }
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
