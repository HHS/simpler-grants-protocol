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
 * Resolves a single $ref string against local $defs first, then external lookup.
 * Returns the resolved schema or null if unresolvable.
 */
export async function resolveRef(
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
 * Flattens a schema that uses allOf with $ref (TypeSpec "extends" pattern)
 * into a single schema with merged properties and required arrays.
 * Also resolves $ref in individual properties.
 *
 * Returns a self-contained schema suitable for JSON Forms rendering.
 */
export async function flattenSchema(
  schema: Record<string, unknown>,
  lookup: SchemaLookup,
): Promise<Record<string, unknown>> {
  const defs = schema.$defs as Record<string, unknown> | undefined;
  const resolved = { ...schema };

  // Flatten allOf with $ref
  if (Array.isArray(resolved.allOf)) {
    const mergedProperties: Record<string, Record<string, unknown>> = {
      ...((resolved.properties as Record<string, Record<string, unknown>>) ??
        {}),
    };
    const mergedRequired: string[] = [
      ...((resolved.required as string[]) ?? []),
    ];

    for (const entry of resolved.allOf as Record<string, unknown>[]) {
      if (typeof entry.$ref === "string") {
        const refSchema = await lookup(entry.$ref as string);
        if (refSchema) {
          const refDefs = refSchema.$defs as
            | Record<string, unknown>
            | undefined;
          const refProps =
            (refSchema.properties as Record<string, Record<string, unknown>>) ??
            {};
          for (const [key, prop] of Object.entries(refProps)) {
            mergedProperties[key] = await resolvePropertyRef(
              prop,
              lookup,
              refDefs ?? defs,
            );
          }
          if (Array.isArray(refSchema.required)) {
            mergedRequired.push(...(refSchema.required as string[]));
          }
        }
      }
    }

    resolved.properties = mergedProperties;
    if (mergedRequired.length > 0) {
      resolved.required = [...new Set(mergedRequired)];
    }
    delete resolved.allOf;
    delete resolved.unevaluatedProperties;
  }

  // Resolve $ref in top-level properties
  const properties = resolved.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (properties) {
    for (const [key, prop] of Object.entries(properties)) {
      properties[key] = await resolvePropertyRef(prop, lookup, defs);
    }
    resolved.properties = properties;
  }

  return resolved;
}

/**
 * Resolves a $ref in a single property value.
 * Returns the property with the $ref replaced by the resolved schema content.
 */
async function resolvePropertyRef(
  prop: Record<string, unknown>,
  lookup: SchemaLookup,
  defs: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  if (typeof prop.$ref !== "string") return prop;

  const ref = prop.$ref as string;
  const rest = Object.fromEntries(
    Object.entries(prop).filter(([k]) => k !== "$ref"),
  );

  const resolved = await resolveRef(ref, lookup, defs);
  if (resolved) {
    return { ...resolved, ...rest };
  }

  // Can't resolve - return without $ref to avoid downstream errors
  return { type: "object", ...rest };
}
