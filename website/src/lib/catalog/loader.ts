import { Paths } from "../schema/paths";
import * as path from "path";
import type { CatalogItem, CatalogMap } from "./types";

/** Normalizes an array from schema extension (may be string[] from JSON) */
export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Builds the absolute file path for a schema name in the extension schemas directory */
export function schemaFilePath(schemaName: string): string {
  const fileName = schemaName.endsWith(".yaml")
    ? schemaName
    : `${schemaName}.yaml`;
  return path.join(Paths.EXTENSION_SCHEMAS_DIR, fileName);
}

/**
 * Collects unique sorted values from a field across all items in a catalog map.
 *
 * Replaces the repetitive Set-accumulation pattern in domain-specific
 * `getFilterOptions` functions.
 */
export function collectUniqueValues<T extends CatalogItem>(
  items: CatalogMap<T>,
  accessor: (item: T) => string[],
): string[] {
  const set = new Set<string>();
  for (const item of Object.values(items)) {
    for (const value of accessor(item)) {
      if (value) set.add(value);
    }
  }
  return Array.from(set).sort();
}
