import { OpenAPIV3 } from "openapi-types";
import mergeAllOf from "json-schema-merge-allof";

// Simple cache to avoid redundant flattening of the same schemas
const flattenCache = new WeakMap<OpenAPIV3.SchemaObject, OpenAPIV3.SchemaObject>();

/**
 * Collect enum values from a schema and its anyOf/oneOf sub-schemas.
 * Handles both flat enums and unions of enum schemas.
 */
function collectEnumValues(
  schema: OpenAPIV3.SchemaObject
): string[] | undefined {
  if (schema.enum && Array.isArray(schema.enum)) {
    return schema.enum.map((v) => String(v));
  }

  const allValues: string[] = [];
  const union = schema.anyOf || schema.oneOf;
  if (union && Array.isArray(union)) {
    for (const option of union) {
      if (
        typeof option === "object" &&
        option !== null &&
        !("$ref" in option)
      ) {
        const subValues = collectEnumValues(option as OpenAPIV3.SchemaObject);
        if (subValues) {
          allValues.push(...subValues);
        }
      }
    }
  }

  return allValues.length > 0 ? allValues : undefined;
}

/**
 * Deeply flatten `allOf`, `anyOf`, and `oneOf` in a schema by:
 *   1) Resolving anyOf/oneOf by selecting the first compatible non-$ref option,
 *      preserving {type: "null"} variants, and unioning sub-enums
 *   2) Merging top-level allOf into a single schema
 *   3) Recursively descending into properties, items, additionalProperties, etc.
 *   4) Repeating if new allOfs, anyOfs, or oneOfs appear after processing
 */
export function deepFlattenAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (flattenCache.has(schema)) {
    return flattenCache.get(schema)!;
  }

  let processedSchema = schema;
  let hasStructures = true;

  while (hasStructures) {
    processedSchema = resolveAnyOfOneOf(processedSchema);

    if (processedSchema.allOf && Array.isArray(processedSchema.allOf)) {
      try {
        processedSchema = mergeAllOf(processedSchema) as OpenAPIV3.SchemaObject;
      } catch (error) {
        console.warn("Failed to merge allOf, keeping original schema:", error);
        delete processedSchema.allOf;
      }
    }

    processedSchema = recursivelyFlattenSubSchemas(processedSchema);

    hasStructures =
      !!(processedSchema.allOf && Array.isArray(processedSchema.allOf)) ||
      !!(processedSchema.anyOf && Array.isArray(processedSchema.anyOf)) ||
      !!(processedSchema.oneOf && Array.isArray(processedSchema.oneOf));
  }

  flattenCache.set(schema, processedSchema);
  return processedSchema;
}

/**
 * Resolve anyOf/oneOf by selecting the first option that's not a reference.
 * Preserves {type: "null"} variants and unions sub-enum values.
 */
function resolveAnyOfOneOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  for (const key of ["anyOf", "oneOf"] as const) {
    if (!schema[key] || !Array.isArray(schema[key]) || schema[key].length === 0) {
      continue;
    }

    // Cast to allow access to type property including "null" which is not in OpenAPIV3 types
    const options = schema[key] as unknown as Record<string, unknown>[];

    const hasNullVariant = options.some(
      (opt) =>
        typeof opt === "object" &&
        opt !== null &&
        !("$ref" in opt) &&
        (opt as Record<string, unknown>).type === "null"
    );

    let mergedOption: OpenAPIV3.SchemaObject | null = null;
    for (const optRecord of options) {
      if (
        typeof optRecord === "object" &&
        optRecord !== null &&
        !("$ref" in optRecord)
      ) {
        if ((optRecord as Record<string, unknown>).type !== "null") {
          mergedOption = deepFlattenAllOf(optRecord as OpenAPIV3.SchemaObject);
          break;
        }
      }
    }

    const baseSchema = { ...schema };
    delete baseSchema[key];

    if (mergedOption) {
      const result = { ...baseSchema, ...mergedOption };

      const enumValues = collectEnumValues(
        { [key]: schema[key] } as OpenAPIV3.SchemaObject
      );
      if (enumValues && enumValues.length > 0) {
        result.enum = enumValues;
      }

      if (hasNullVariant) {
        (result as Record<string, unknown>).anyOf = [{ type: "null" }];
      }

      return result;
    }

    return baseSchema;
  }

  return schema;
}

function recursivelyFlattenSubSchemas(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (schema.properties && typeof schema.properties === "object") {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === "object") {
        schema.properties[propName] = deepFlattenAllOf(propSchema as OpenAPIV3.SchemaObject);
      }
    }
  }

  if (schema.type === "array" && schema.items && typeof schema.items === "object") {
    schema.items = deepFlattenAllOf(schema.items as OpenAPIV3.SchemaObject);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    schema.additionalProperties = deepFlattenAllOf(
      schema.additionalProperties as OpenAPIV3.SchemaObject
    );
  }

  return schema;
}
