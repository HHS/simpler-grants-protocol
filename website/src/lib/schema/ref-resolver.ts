import $RefParser from "@apidevtools/json-schema-ref-parser";
import mergeAllOf from "json-schema-merge-allof";

/**
 * Loads a schema by file path, resolves all $ref references, and returns
 * the raw dereferenced result. Uses `@apidevtools/json-schema-ref-parser`.
 */
export async function resolveSchemaRefs(
  schemaPath: string,
): Promise<Record<string, unknown>> {
  return (await $RefParser.dereference(schemaPath)) as Record<string, unknown>;
}

/**
 * Fully dereferences a schema file: resolves all $ref references, merges
 * allOf entries (from TypeSpec "extends" patterns), and strips $schema
 * (which can confuse downstream AJV consumers like JSON Forms).
 *
 * This is the main entry point for preparing a schema for rendering.
 */
export async function dereferenceSchema(
  schemaPath: string,
): Promise<Record<string, unknown>> {
  const resolved = await resolveSchemaRefs(schemaPath);
  // For allOf merges, the base schema (child) comes first and allOf entries
  // (parent) come after. For custom extension keys (x-tags, x-ui-schema,
  // x-mapping-*), the child's values should override the parent's.
  const merged = mergeAllOf(resolved, {
    resolvers: {
      defaultResolver: (values) => values[0],
    },
  }) as Record<string, unknown>;
  delete merged.$schema;
  return merged;
}
