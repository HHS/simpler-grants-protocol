import { Paths } from "../schema/paths";
import * as path from "path";
import type { CatalogItem, CatalogMap } from "./types";

// =============================================================================
// Schema file helpers
// =============================================================================

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

/** Builds the absolute file path for a form schema in the form schemas directory */
export function formSchemaFilePath(schemaName: string): string {
  const fileName = schemaName.endsWith(".yaml")
    ? schemaName
    : `${schemaName}.yaml`;
  return path.join(Paths.FORM_SCHEMAS_DIR, fileName);
}

// =============================================================================
// Filter helpers
// =============================================================================

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

// =============================================================================
// Schema extraction helpers
// =============================================================================

/** A function that extracts a value from a raw JSON schema object */
type SchemaExtractor<T> = (schema: Record<string, unknown>) => T;

/**
 * An extractor map defines how to pull each field from a raw schema.
 *
 * Each key corresponds to a field in the output type, and each value is
 * a function that reads that field from the schema.
 */
type ExtractorMap<T extends Record<string, unknown>> = {
  [K in keyof T]: SchemaExtractor<T[K]>;
};

/**
 * Runs a map of extractors against a raw schema, returning a typed result.
 *
 * This replaces the repetitive `extractSchemaData` functions in each loader.
 * Instead of writing imperative extraction code, each loader declares a map
 * of field names to extractor functions, making it easy to see what is unique
 * to each domain.
 *
 * @example
 * ```ts
 * const data = extractFromSchema(schema, {
 *   name: getString("title"),
 *   tags: getStringArray("x-tags"),
 *   properties: getObject("properties"),
 * });
 * ```
 */
export function extractFromSchema<T extends Record<string, unknown>>(
  schema: Record<string, unknown>,
  extractors: ExtractorMap<T>,
): T {
  const result = {} as T;
  for (const key of Object.keys(extractors) as Array<keyof T>) {
    result[key] = extractors[key](schema);
  }
  return result;
}

// --- Built-in extractor factories ---

/** Extracts a string from a top-level schema key, defaulting to "" */
export function getString(key: string): SchemaExtractor<string> {
  return (schema) => {
    const value = schema[key];
    return typeof value === "string" ? value : "";
  };
}

/** Extracts a string array from a top-level schema key (e.g. x-tags) */
export function getStringArray(key: string): SchemaExtractor<string[]> {
  return (schema) => parseStringArray(schema[key]);
}

/** Extracts an object from a top-level schema key, defaulting to {} */
export function getObject(
  key: string,
): SchemaExtractor<Record<string, unknown>> {
  return (schema) => {
    const value = schema[key];
    return (typeof value === "object" && value !== null ? value : {}) as Record<
      string,
      unknown
    >;
  };
}

/** Extracts an array from a top-level schema key, defaulting to [] */
export function getArray(key: string): SchemaExtractor<unknown[]> {
  return (schema) => {
    const value = schema[key];
    return Array.isArray(value) ? value : [];
  };
}

/**
 * Extracts a string from a `const` value in a nested property.
 *
 * Used for schemas where field values are pinned via JSON Schema `const`,
 * e.g. `schema.properties.name.const === "agency"`.
 */
export function getPropertyConst(propName: string): SchemaExtractor<string> {
  return (schema) => {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const value = properties?.[propName]?.const;
    return typeof value === "string" ? value : "";
  };
}

/**
 * Extracts examples from a nested property.
 *
 * Used for schemas where examples live on a specific property,
 * e.g. `schema.properties.value.examples`.
 */
export function getPropertyExamples(
  propName: string,
): SchemaExtractor<unknown[]> {
  return (schema) => {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const examples = properties?.[propName]?.examples;
    return Array.isArray(examples) ? examples : [];
  };
}
