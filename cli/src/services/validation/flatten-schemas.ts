import { OpenAPIV3 } from "openapi-types";
import mergeAllOf from "json-schema-merge-allof";

/**
 * Deeply flatten `allOf` in a schema by:
 *   1) Merging top-level allOf into a single schema
 *   2) Recursively descending into properties, items, additionalProperties, etc.
 *   3) Repeating if new allOfs appear after merging
 */
export function deepFlattenAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  // 1) Merge top-level allOf (if any)
  let mergedSchema = mergeOneLevelAllOf(schema);

  // 2) Recursively flatten sub-schemas
  mergedSchema = recursivelyFlattenSubSchemas(mergedSchema);

  // 3) It's possible the recursion introduced new top-level allOfs
  //    (in rare cases if merging merges references in a certain way).
  //    So we can repeat until stable if desired:
  //    But usually one pass is sufficient for top-level.
  mergedSchema = mergeOneLevelAllOf(mergedSchema);

  return mergedSchema;
}

/**
 * Merge top-level allOf (only) if present on a schema using `json-schema-merge-allof`.
 * Returns a new schema with top-level `allOf` removed.
 */
function mergeOneLevelAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (schema.allOf && schema.allOf.length > 0) {
    // The library merges top-level `allOf` into a new schema
    const merged = mergeAllOf(schema, { ignoreAdditionalProperties: false });
    return merged as OpenAPIV3.SchemaObject;
  }
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
