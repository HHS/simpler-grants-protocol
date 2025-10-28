/**
 * OpenAPI spec transformation utilities for CommonGrants CLI validation.
 *
 * PROBLEM
 * -------
 * The CommonGrants CLI validation tool expects OpenAPI specs to follow specific composition patterns that match the CommonGrants protocol base specification. However, different web frameworks generate OpenAPI specs with different composition patterns that cause validation to fail.
 *
 * For example, APIFlask generates schemas like this:
 * ```yaml
 * paginationInfo:
 *   type: [object]          # ← Problem: unnecessary type field
 *   allOf:
 *   - $ref: '#/components/schemas/PaginatedResultsInfo'
 * ```
 *
 * But the CommonGrants protocol base spec uses:
 * ```yaml
 * paginationInfo:
 *   allOf:                  # ← Expected: just allOf, no type field
 *   - $ref: '#/components/schemas/CommonGrants.Pagination.PaginatedResultsInfo'
 * ```
 *
 * This causes validation errors like:
 * "Type mismatch. Base is 'object', impl is 'object'"
 *
 * SOLUTION
 * --------
 * Transform the implementation spec to match the base spec's composition patterns before validation. This is done by:
 *
 * 1. **Schema Inlining**: Replace `$ref` references in response schemas with the actual schema definitions to enable composition pattern fixes.
 *
 * 2. **Composition Pattern Fixing**: Recursively find and fix the problematic pattern:
 *    - Find: `type: [object]` + `allOf` (or `type: "object"` + `allOf`)
 *    - Fix: Remove the `type` field, keep only `allOf`
 *
 * 3. **Structure Normalization**: Convert `allOf` patterns with single `$ref` items to direct `$ref` patterns to match the base spec structure.
 *
 * 4. **Generic Pattern Detection**: Use recursive traversal to find and fix patterns anywhere in the schema structure, regardless of property names or nesting levels.
 *
 * IMPLEMENTATION
 * --------------
 * - `transformSpecCompositionToCg()`: Main function that orchestrates the transformation
 * - `fixSchemaComposition()`: Generic recursive function that fixes composition patterns
 * - `detectCompositionIssues()`: Fast detection function to determine if transformation is needed
 */

import { OpenAPIV3 } from "openapi-types";

type SchemaObject = OpenAPIV3.SchemaObject;
type Document = OpenAPIV3.Document;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type ResponseObject = OpenAPIV3.ResponseObject;
type MediaTypeObject = OpenAPIV3.MediaTypeObject;
type OperationObject = OpenAPIV3.OperationObject;

/**
 * Post-process the OpenAPI spec to match CommonGrants composition patterns.
 */
export function transformSpecCompositionToCg(spec: Document): Document {
  if (!spec || typeof spec !== "object") {
    throw new Error("Invalid spec: must be a valid OpenAPI document");
  }

  // Fix response schema composition patterns
  const paths = spec.paths || {};
  for (const [, pathObj] of Object.entries(paths)) {
    if (!pathObj) continue;

    for (const [, operation] of Object.entries(pathObj)) {
      if (typeof operation !== "object" || !operation) continue;

      // Type guard to ensure this is an OperationObject
      if ("responses" in operation) {
        const op = operation as OperationObject;
        const responses = op.responses || {};
        for (const [, response] of Object.entries(responses)) {
          if (typeof response !== "object" || !response) continue;

          // Type guard to ensure this is a ResponseObject (not ReferenceObject)
          if ("content" in response) {
            const resp = response as ResponseObject;
            const content = resp.content || {};
            for (const [, mediaObj] of Object.entries(content)) {
              if (typeof mediaObj !== "object" || !mediaObj) continue;

              const media = mediaObj as MediaTypeObject;
              const schema = media.schema;
              if (schema && typeof schema === "object") {
                if ("$ref" in schema) {
                  // This is a separate response schema - we need to inline it
                  const schemaRef = (schema as ReferenceObject).$ref;
                  const schemaName = schemaRef.split("/").pop();

                  if (schemaName) {
                    // Get the actual schema from components
                    const components = spec.components || {};
                    const schemas = components.schemas || {};
                    const actualSchema = schemas[schemaName];

                    if (
                      actualSchema &&
                      typeof actualSchema === "object" &&
                      !("$ref" in actualSchema)
                    ) {
                      // Replace the $ref with the actual schema
                      media.schema = actualSchema;

                      // Fix the composition patterns
                      media.schema = fixSchemaComposition(
                        actualSchema,
                        schemas as Record<string, SchemaObject>
                      ) as SchemaObject | ReferenceObject;
                    }
                  }
                } else {
                  // This is an inline schema - fix composition patterns directly
                  const components = spec.components || {};
                  const schemas = components.schemas || {};
                  media.schema = fixSchemaComposition(
                    schema,
                    schemas as Record<string, SchemaObject>
                  ) as SchemaObject | ReferenceObject;
                }
              }
            }
          }
        }
      }
    }
  }

  // Also fix composition patterns in component schemas
  const components = spec.components || {};
  const schemas = components.schemas || {};
  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    if (schemaDef && typeof schemaDef === "object" && !("$ref" in schemaDef)) {
      const schema = schemaDef as SchemaObject;
      schemas[schemaName] = fixSchemaComposition(
        schema,
        schemas as Record<string, SchemaObject>
      ) as SchemaObject | ReferenceObject;
    }
  }

  return spec;
}

/**
 * Fix schema composition to match CommonGrants patterns.
 * Recursively finds and fixes the problematic pattern: `type: [object] + allOf`
 */
export function fixSchemaComposition(
  schema: SchemaObject | unknown,
  allSchemas: Record<string, SchemaObject>
): SchemaObject | ReferenceObject | unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  const schemaObj = schema as Record<string, unknown>;

  // Fix the problematic pattern: type: [object] + allOf -> just allOf
  if ("type" in schemaObj && "allOf" in schemaObj) {
    // Check if type is [object] or just "object"
    const typeValue = schemaObj.type;
    if ((Array.isArray(typeValue) && typeValue.includes("object")) || typeValue === "object") {
      // Remove the type field, keep only allOf
      delete schemaObj.type;
    }
  }

  // Recursively process nested objects first
  for (const [key, value] of Object.entries(schemaObj)) {
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        schemaObj[key] = value.map(item =>
          typeof item === "object" && item ? fixSchemaComposition(item, allSchemas) : item
        );
      } else {
        schemaObj[key] = fixSchemaComposition(value, allSchemas);
      }
    }
  }

  // Convert allOf with single $ref to direct $ref to match base spec structure
  // This runs after recursive processing to ensure all nested objects are processed first
  if ("allOf" in schemaObj && Array.isArray(schemaObj.allOf) && schemaObj.allOf.length === 1) {
    const allOfItem = schemaObj.allOf[0];
    if (typeof allOfItem === "object" && allOfItem !== null && "$ref" in allOfItem) {
      // Replace allOf with direct $ref
      const refValue = (allOfItem as ReferenceObject).$ref;
      delete schemaObj.allOf;
      schemaObj.$ref = refValue;
    }
  }

  return schemaObj;
}

/**
 * Detect if a spec has composition issues that require transformation.
 *
 * This function performs a fast scan for the problematic pattern:
 * `type: [object]` + `allOf` or `type: "object"` + `allOf`
 *
 * @param spec - The OpenAPI spec to check
 * @returns true if transformation is needed, false otherwise
 */
export function detectCompositionIssues(spec: Document): boolean {
  if (!spec || typeof spec !== "object") {
    return false;
  }

  // Check response schemas
  const paths = spec.paths || {};
  for (const [, pathObj] of Object.entries(paths)) {
    if (!pathObj) continue;

    for (const [, operation] of Object.entries(pathObj)) {
      if (typeof operation !== "object" || !operation) continue;

      // Type guard to ensure this is an OperationObject
      if ("responses" in operation) {
        const op = operation as OperationObject;
        const responses = op.responses || {};
        for (const [, response] of Object.entries(responses)) {
          if (typeof response !== "object" || !response) continue;

          // Type guard to ensure this is a ResponseObject (not ReferenceObject)
          if ("content" in response) {
            const resp = response as ResponseObject;
            const content = resp.content || {};
            for (const [, mediaObj] of Object.entries(content)) {
              if (typeof mediaObj !== "object" || !mediaObj) continue;

              const media = mediaObj as MediaTypeObject;
              const schema = media.schema;

              // Check if this schema has the problematic pattern
              if (hasCompositionIssue(schema)) {
                return true;
              }
            }
          }
        }
      }
    }
  }

  // Check component schemas
  const components = spec.components || {};
  const schemas = components.schemas || {};
  for (const [, schemaDef] of Object.entries(schemas)) {
    if (schemaDef && typeof schemaDef === "object" && !("$ref" in schemaDef)) {
      if (hasCompositionIssue(schemaDef)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a single schema object has the problematic composition pattern.
 *
 * @param schema - The schema object to check
 * @returns true if the schema has composition issues
 */
function hasCompositionIssue(schema: unknown): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }

  const schemaObj = schema as Record<string, unknown>;

  // Check for the problematic pattern: type: [object] + allOf or type: "object" + allOf
  if ("type" in schemaObj && "allOf" in schemaObj) {
    const typeValue = schemaObj.type;
    if ((Array.isArray(typeValue) && typeValue.includes("object")) || typeValue === "object") {
      return true;
    }
  }

  // Recursively check nested objects
  for (const [, value] of Object.entries(schemaObj)) {
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item && hasCompositionIssue(item)) {
            return true;
          }
        }
      } else if (hasCompositionIssue(value)) {
        return true;
      }
    }
  }

  return false;
}
