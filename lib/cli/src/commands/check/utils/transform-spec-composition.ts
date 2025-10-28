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
 */

import { OpenAPIV3 } from "openapi-types";

type SchemaObject = OpenAPIV3.SchemaObject;
type Document = OpenAPIV3.Document;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type ResponseObject = OpenAPIV3.ResponseObject;
type MediaTypeObject = OpenAPIV3.MediaTypeObject;
type OperationObject = OpenAPIV3.OperationObject;

interface SchemaContext {
  path: string;
  operation?: string;
  responseCode?: string;
  mediaType?: string;
  isComponent?: boolean;
  schemaName?: string;
}

type SchemaCallback = (
  schema: SchemaObject | ReferenceObject,
  context: SchemaContext
) => void | boolean;

/**
 * Check if two schema objects have different composition patterns.
 * Optimized to focus on the two main transformation patterns.
 */
function hasCompositionPatternChanged(
  original: Record<string, unknown>,
  transformed: Record<string, unknown>
): boolean {
  // Pattern 1: type field was removed (type: "object" + allOf -> allOf)
  if ("type" in original && !("type" in transformed)) {
    return true;
  }

  // Pattern 2: allOf was converted to $ref (allOf: [{$ref}] -> $ref)
  if ("allOf" in original && !("allOf" in transformed) && "$ref" in transformed) {
    return true;
  }

  // Pattern 3: allOf array length changed (single item -> direct $ref)
  if ("allOf" in original && "allOf" in transformed) {
    const originalAllOf = original.allOf;
    const transformedAllOf = transformed.allOf;
    if (Array.isArray(originalAllOf) && Array.isArray(transformedAllOf)) {
      if (originalAllOf.length !== transformedAllOf.length) {
        return true;
      }
    }
  }

  // No significant composition pattern changes detected
  return false;
}

/**
 * Navigate to a specific media type object in the OpenAPI spec.
 * Returns the media object if found, undefined otherwise.
 */
function getMediaObject(
  spec: Document,
  path: string,
  operation: string,
  responseCode: string,
  mediaType: string
): MediaTypeObject | undefined {
  const pathObj = spec.paths?.[path];
  if (!pathObj || typeof pathObj !== "object" || Array.isArray(pathObj)) {
    return undefined;
  }

  const operationObj = pathObj[operation as keyof typeof pathObj];
  if (!operationObj || typeof operationObj !== "object" || !("responses" in operationObj)) {
    return undefined;
  }

  const op = operationObj as OperationObject;
  const response = op.responses?.[responseCode];
  if (!response || typeof response !== "object" || !("content" in response)) {
    return undefined;
  }

  const resp = response as ResponseObject;
  const media = resp.content?.[mediaType];
  if (!media || typeof media !== "object") {
    return undefined;
  }

  return media as MediaTypeObject;
}

/**
 * Common traversal logic for both detection and transformation.
 * Traverses all schemas in the OpenAPI spec and calls the callback for each one.
 * Returns true if traversal should continue, false if it should stop early.
 */
function traverseSchemas(spec: Document, callback: SchemaCallback): boolean {
  if (!spec || typeof spec !== "object") {
    return true;
  }

  // Traverse response schemas
  const paths = spec.paths || {};
  for (const [path, pathObj] of Object.entries(paths)) {
    if (!pathObj) continue;

    for (const [operation, operationObj] of Object.entries(pathObj)) {
      if (typeof operationObj !== "object" || !operationObj) continue;

      // Type guard to ensure this is an OperationObject
      if ("responses" in operationObj) {
        const op = operationObj as OperationObject;
        const responses = op.responses || {};
        for (const [responseCode, response] of Object.entries(responses)) {
          if (typeof response !== "object" || !response) continue;

          // Type guard to ensure this is a ResponseObject (not ReferenceObject)
          if ("content" in response) {
            const resp = response as ResponseObject;
            const content = resp.content || {};
            for (const [mediaType, mediaObj] of Object.entries(content)) {
              if (typeof mediaObj !== "object" || !mediaObj) continue;

              const media = mediaObj as MediaTypeObject;
              const schema = media.schema;
              if (schema && typeof schema === "object") {
                const context: SchemaContext = {
                  path,
                  operation,
                  responseCode,
                  mediaType,
                  isComponent: false,
                };
                const result = callback(schema, context);
                if (result === false) {
                  return false; // Early exit
                }
              }
            }
          }
        }
      }
    }
  }

  // Traverse component schemas
  const components = spec.components || {};
  const schemas = components.schemas || {};
  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    if (schemaDef && typeof schemaDef === "object" && !("$ref" in schemaDef)) {
      const context: SchemaContext = {
        path: `#/components/schemas/${schemaName}`,
        isComponent: true,
        schemaName,
      };
      const result = callback(schemaDef, context);
      if (result === false) {
        return false; // Early exit
      }
    }
  }

  return true;
}

/**
 * Post-process the OpenAPI spec to match CommonGrants composition patterns.
 * Returns both the transformed spec and whether any issues were found.
 */
export function transformSpecCompositionToCg(spec: Document): {
  transformed: Document;
  hadIssues: boolean;
} {
  if (!spec || typeof spec !== "object") {
    throw new Error("Invalid spec: must be a valid OpenAPI document");
  }

  let hadIssues = false;
  const components = spec.components || {};
  const schemas = components.schemas || {};

  // Process response schemas with inlining and transformation
  traverseSchemas(spec, (schema, context) => {
    if (!context.isComponent) {
      // This is a response schema - handle inlining and transformation
      if ("$ref" in schema) {
        const schemaRef = (schema as ReferenceObject).$ref;
        const schemaName = schemaRef.split("/").pop();

        if (schemaName && schemas[schemaName]) {
          const actualSchema = schemas[schemaName];
          if (typeof actualSchema === "object" && !("$ref" in actualSchema)) {
            // Replace the $ref with the actual schema using extracted navigation logic
            const { mediaType, responseCode, operation, path } = context;
            if (path && operation && responseCode && mediaType) {
              const media = getMediaObject(spec, path, operation, responseCode, mediaType);
              if (media) {
                // Create a copy of the actual schema to preserve original for comparison
                const originalSchema = { ...actualSchema } as Record<string, unknown>;
                media.schema = actualSchema;
                const transformedSchema = fixSchemaComposition(
                  actualSchema,
                  schemas as Record<string, SchemaObject>
                ) as SchemaObject | ReferenceObject;

                // Check if transformation occurred using proper change detection
                if (
                  hasCompositionPatternChanged(
                    originalSchema,
                    transformedSchema as Record<string, unknown>
                  )
                ) {
                  hadIssues = true;
                }
                media.schema = transformedSchema;
              }
            }
          }
        }
      } else {
        // This is an inline schema - fix composition patterns directly
        const { mediaType, responseCode, operation, path } = context;
        if (path && operation && responseCode && mediaType) {
          const media = getMediaObject(spec, path, operation, responseCode, mediaType);
          if (media) {
            // Create a copy of the schema to preserve original for comparison
            const originalSchema = { ...schema } as Record<string, unknown>;
            const transformedSchema = fixSchemaComposition(
              schema,
              schemas as Record<string, SchemaObject>
            ) as SchemaObject | ReferenceObject;

            // Check if transformation occurred using proper change detection
            if (
              hasCompositionPatternChanged(
                originalSchema,
                transformedSchema as Record<string, unknown>
              )
            ) {
              hadIssues = true;
            }
            media.schema = transformedSchema;
          }
        }
      }
    }
  });

  // Process component schemas with lazy evaluation
  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    if (schemaDef && typeof schemaDef === "object" && !("$ref" in schemaDef)) {
      const schema = schemaDef as SchemaObject;

      // Only create copy and transform if issues are detected
      if (hasCompositionIssue(schema)) {
        // Create a shallow copy to preserve original for comparison
        const originalSchema = { ...schema } as Record<string, unknown>;
        const transformedSchema = fixSchemaComposition(
          schema,
          schemas as Record<string, SchemaObject>
        ) as SchemaObject | ReferenceObject;

        // Check if transformation actually occurred
        if (
          hasCompositionPatternChanged(originalSchema, transformedSchema as Record<string, unknown>)
        ) {
          hadIssues = true;
        }

        schemas[schemaName] = transformedSchema;
      }
    }
  }

  return { transformed: spec, hadIssues };
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
 * Uses early exit optimization for better performance.
 *
 * @param spec - The OpenAPI spec to check
 * @returns true if transformation is needed, false otherwise
 */
export function detectCompositionIssues(spec: Document): boolean {
  if (!spec || typeof spec !== "object") {
    return false;
  }

  // Use the common traversal logic with early exit
  return !traverseSchemas(spec, schema => {
    if (hasCompositionIssue(schema)) {
      return false; // Early exit: stop processing as soon as we find an issue
    }
    return true; // Continue processing
  });
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
