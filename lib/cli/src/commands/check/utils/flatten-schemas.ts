import { OpenAPIV3 } from "openapi-types";
import mergeAllOf from "json-schema-merge-allof";

// Simple cache to avoid redundant flattening of the same schemas
const flattenCache = new WeakMap<OpenAPIV3.SchemaObject, OpenAPIV3.SchemaObject>();

/**
 * Deeply flatten `allOf` and `anyOf` in a schema by:
 *   1) Resolving anyOf by selecting the first compatible option
 *   2) Merging top-level allOf into a single schema
 *   3) Recursively descending into properties, items, additionalProperties, etc.
 *   4) Repeating if new allOfs or anyOfs appear after processing
 */
export function deepFlattenAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  // Check cache first
  if (flattenCache.has(schema)) {
    return flattenCache.get(schema)!;
  }

  // Keep processing until no more allOf or anyOf structures remain
  let processedSchema = schema;
  let hasStructures = true;

  while (hasStructures) {
    // 1) Resolve anyOf (if any)
    processedSchema = resolveAnyOf(processedSchema);

    // 2) Merge allOf (if any)
    if (processedSchema.allOf && Array.isArray(processedSchema.allOf)) {
      try {
        processedSchema = mergeAllOf(processedSchema) as OpenAPIV3.SchemaObject;
      } catch (error) {
        console.warn("Failed to merge allOf, keeping original schema:", error);
        // Remove allOf but keep the rest of the schema
        delete processedSchema.allOf;
      }
    }

    // 3) Recursively flatten sub-schemas
    processedSchema = recursivelyFlattenSubSchemas(processedSchema);

    // 4) Check if we still have structures to process
    hasStructures =
      !!(processedSchema.allOf && Array.isArray(processedSchema.allOf)) ||
      !!(processedSchema.anyOf && Array.isArray(processedSchema.anyOf));
  }

  // Cache the result
  flattenCache.set(schema, processedSchema);
  return processedSchema;
}

/**
 * Resolve anyOf by selecting the first option that's not a reference.
 * This is a simplified approach that avoids complex union type resolution.
 */
function resolveAnyOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (!schema.anyOf || schema.anyOf.length === 0) {
    return schema;
  }

  // For now, select the first option that's not a reference
  for (let i = 0; i < schema.anyOf.length; i++) {
    const option = schema.anyOf[i];
    if (typeof option === "object" && option !== null && !("$ref" in option)) {
      // Recursively process the selected option
      const processedOption = deepFlattenAllOf(option as OpenAPIV3.SchemaObject);

      // Merge the selected option with the base schema
      const baseSchema = { ...schema };
      delete baseSchema.anyOf;
      return { ...baseSchema, ...processedOption };
    }
  }

  // If no suitable anyOf option found, keep original schema
  return schema;
}

/**
 * Recursively flatten sub-schemas in properties, items, additionalProperties, etc.
 */
function recursivelyFlattenSubSchemas(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  // We only handle object fields if the schema is actually an object in practice
  // (or we handle them unconditionally, depending on your usage).
  // If `schema.type` is "object" or is missing, we still might have `properties`.
  if (schema.properties && typeof schema.properties === "object") {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === "object") {
        schema.properties[propName] = deepFlattenAllOf(propSchema as OpenAPIV3.SchemaObject);
      }
    }
  }

  // If the schema is an array type and has an `items` property that is an object
  if (schema.type === "array" && schema.items && typeof schema.items === "object") {
    schema.items = deepFlattenAllOf(schema.items as OpenAPIV3.SchemaObject);
  }

  // If the schema has `additionalProperties` as an object
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    schema.additionalProperties = deepFlattenAllOf(
      schema.additionalProperties as OpenAPIV3.SchemaObject
    );
  }

  return schema;
}
