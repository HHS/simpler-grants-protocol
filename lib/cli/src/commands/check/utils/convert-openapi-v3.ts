import { OpenAPIV3 } from "openapi-types";

/**
 * Script to transform OpenAPI specifications.
 *
 * This module provides functionality to transform OpenAPI specifications from one
 * version to another, e.g. v3.1 to v3.0
 */

// OpenAPI version constants
const OPENAPI_V3 = "3.0.0";

export type OpenAPISchema = OpenAPIV3.Document & {
  definitions?: Record<string, unknown>;
};

/**
 * Convert OpenAPI schema v3.1 to 3.0.
 *
 * @param schema - The base OpenAPI schema from FastAPI
 * @returns The schema converted to OpenAPI 3.0 format
 */
export function convertOpenApiToV3(schema: OpenAPISchema): OpenAPISchema {
  // Set OpenAPI version
  schema.openapi = OPENAPI_V3;

  // Move schemas from components to definitions
  moveSchemasToDefinitions(schema);

  // Convert all schema references
  return convertRefs(schema) as OpenAPISchema;
}

/**
 * Move schemas from components to definitions for OpenAPI 3.0.0 compatibility.
 *
 * @param schema - The OpenAPI schema to modify
 */
function moveSchemasToDefinitions(schema: OpenAPISchema): void {
  // Initialize definitions if it doesn't exist
  if (!schema.definitions) {
    schema.definitions = {};
  }

  // Move schemas from components to definitions
  if (schema.components && schema.components.schemas) {
    schema.definitions = { ...schema.definitions, ...schema.components.schemas };
    // Keep the components section but remove schemas
    if (Object.keys(schema.components).length === 1) {
      // Only had schemas
      delete schema.components;
    } else {
      delete schema.components.schemas;
    }
  }

  // Move $defs to definitions
  moveDefsToDefinitions(schema);
}

/**
 * Move $defs sections to definitions for OpenAPI 3.0.0 compatibility.
 *
 * @param obj - The object to process
 */
function moveDefsToDefinitions(obj: unknown): void {
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      obj.forEach(item => moveDefsToDefinitions(item));
    } else {
      // Check if this object has $defs
      const o = obj as Record<string, unknown>;
      if (o.$defs && typeof o.$defs === "object") {
        // Move $defs to the root definitions
        if (!o.definitions) {
          o.definitions = {};
        }
        o.definitions = { ...(o.definitions as object), ...(o.$defs as object) };
        delete o.$defs;
      }
      // Recursively process all properties
      for (const value of Object.values(o)) {
        moveDefsToDefinitions(value);
      }
    }
  }
}

/**
 * Convert a schema reference to OpenAPI 3.0.0 format.
 *
 * @param ref - The reference string to convert
 * @returns The converted reference
 */
function convertRef(ref: string): string {
  if (ref.includes("#/components/schemas/")) {
    return ref.replace("#/components/schemas/", "#/definitions/");
  }
  if (ref.includes("#/$defs/")) {
    return ref.replace("#/$defs/", "#/definitions/");
  }
  return ref;
}

/**
 * Convert all schema references from components to definitions.
 *
 * @param obj - The object to convert references in
 * @returns The object with converted references
 */
function convertRefs(obj: unknown): unknown {
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => convertRefs(item));
    } else {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === "$ref") {
          result[k] = convertRef(v as string);
        } else {
          result[k] = convertRefs(v);
        }
      }
      return result;
    }
  }
  return obj;
}
