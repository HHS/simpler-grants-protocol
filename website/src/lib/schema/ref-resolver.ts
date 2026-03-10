import type Ajv2020 from "ajv/dist/2020";

/**
 * Hand-rolled $ref resolution and allOf flattening for JSON Schemas.
 *
 * TODO: Consider replacing with `@apidevtools/json-schema-ref-parser` (for
 * $ref resolution) and `json-schema-merge-allof` (for allOf flattening).
 * Both are already used in the CLI package (`lib/cli/`).
 *
 * The underlying schemas are YAML files on disk (see `Paths` in
 * `src/lib/schema/paths.ts`), so `json-schema-ref-parser` could resolve
 * `$ref`s directly from those directories. The main remaining blocker:
 *
 * AJV coupling — schemas are currently loaded into AJV for validation
 * (see `createAjvWithSchemas` in `validation.ts`), and this module
 * piggybacks on that registry for lookups. Using `json-schema-ref-parser`
 * would mean either resolving refs twice (once from disk, once via AJV)
 * or removing AJV from the resolution path entirely.
 *
 * If the resolution logic here grows significantly, it may be worth the
 * trade-off.
 */

/**
 * A function that looks up a schema by its $ref identifier.
 * Returns the raw schema object or null if not found.
 * Async to support both in-memory (AJV) and file-based resolvers.
 */
export type SchemaLookup = (
  ref: string,
) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;

/**
 * Creates a SchemaLookup backed by an AJV instance.
 */
export function createAjvLookup(ajv: Ajv2020): SchemaLookup {
  return (ref: string) => {
    const validator = ajv.getSchema(ref);
    if (!validator?.schema) return null;
    return validator.schema as Record<string, unknown>;
  };
}

/**
 * Deeply resolves all $ref references in a schema tree.
 *
 * Handles both local $defs and external references via the lookup function.
 * Protects against circular references with a visited set.
 */
export async function resolveSchemaRefs(
  schema: unknown,
  lookup: SchemaLookup,
  visited = new Set<string>(),
  currentSchema?: Record<string, unknown>,
): Promise<unknown> {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return Promise.all(
      schema.map((item) =>
        resolveSchemaRefs(item, lookup, visited, currentSchema),
      ),
    );
  }

  const schemaObj = schema as Record<string, unknown>;

  // On first call, use the schema itself as the current schema (for $defs context)
  if (!currentSchema) {
    currentSchema = schemaObj;
  }

  // If this is a $ref, resolve it
  if ("$ref" in schemaObj && typeof schemaObj.$ref === "string") {
    const refId = schemaObj.$ref;

    // Avoid circular references
    if (visited.has(refId)) {
      return schemaObj;
    }

    visited.add(refId);

    const defs = currentSchema.$defs as Record<string, unknown> | undefined;
    const resolved = await resolveRef(refId, lookup, defs);

    if (resolved) {
      // For external refs, use the resolved schema as the new $defs context
      const nextContext = refId.startsWith("#/") ? currentSchema : resolved;
      const result = await resolveSchemaRefs(
        resolved,
        lookup,
        visited,
        nextContext,
      );
      visited.delete(refId);
      return result;
    }

    visited.delete(refId);
    return schemaObj;
  }

  // Recursively resolve all properties
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schemaObj)) {
    if (key === "examples" && Array.isArray(value)) {
      // Preserve examples as-is to avoid converting primitives to empty objects
      result[key] = value;
    } else {
      result[key] = await resolveSchemaRefs(
        value,
        lookup,
        visited,
        currentSchema,
      );
    }
  }

  return result;
}

/**
 * Merges allOf entries into a single schema with combined properties and
 * required arrays. Expects all $ref values to already be resolved (i.e.
 * call resolveSchemaRefs first).
 *
 * Also removes `unevaluatedProperties` which is a leftover from the
 * TypeSpec "extends" pattern that isn't needed after flattening.
 */
export function mergeAllOf(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!Array.isArray(schema.allOf)) {
    return schema;
  }

  const result = { ...schema };
  const mergedProperties: Record<string, unknown> = {
    ...((result.properties as Record<string, unknown>) ?? {}),
  };
  const mergedRequired: string[] = [...((result.required as string[]) ?? [])];

  for (const entry of result.allOf as Record<string, unknown>[]) {
    const entryProps = entry.properties as Record<string, unknown> | undefined;
    if (entryProps) {
      Object.assign(mergedProperties, entryProps);
    }
    if (Array.isArray(entry.required)) {
      mergedRequired.push(...(entry.required as string[]));
    }
  }

  result.properties = mergedProperties;
  if (mergedRequired.length > 0) {
    result.required = [...new Set(mergedRequired)];
  }
  delete result.allOf;
  delete result.unevaluatedProperties;

  return result;
}

/**
 * Fully dereferences a schema: resolves all $ref references, merges allOf
 * entries, and strips $schema (which can confuse downstream AJV consumers
 * like JSON Forms).
 *
 * This is the main entry point for preparing a schema for rendering.
 */
export async function dereferenceSchema(
  schema: Record<string, unknown>,
  lookup: SchemaLookup,
): Promise<Record<string, unknown>> {
  const resolved = (await resolveSchemaRefs(schema, lookup)) as Record<
    string,
    unknown
  >;
  const merged = mergeAllOf(resolved);
  delete merged.$schema;
  return merged;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a single $ref string against local $defs first, then external lookup.
 */
async function resolveRef(
  ref: string,
  lookup: SchemaLookup,
  defs?: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  // Try local $defs first
  if (ref.startsWith("#/$defs/") && defs) {
    const defName = ref.slice("#/$defs/".length);
    const def = defs[defName];
    if (def && typeof def === "object") {
      return def as Record<string, unknown>;
    }
  }

  // Try external lookup
  return lookup(ref);
}
