import { ajv } from "../validation";
import * as OpenAPISampler from "openapi-sampler";

/**
 * Generates a sample example for a given schema path.
 * @param schemaPath - The path to the schema file.
 * @returns The generated example.
 */
export function generateSchemaExample(schemaPath: string): string {
  //
  const schemaName: string = schemaPath.split("/").pop() ?? "";
  const validator = ajv.getSchema(schemaName);
  if (!validator) {
    throw new Error(`Schema ${schemaPath} not found for ${schemaPath}`);
  }

  // Get the actual schema object from the validator
  const schema = validator.schema;
  if (!schema) {
    throw new Error(`Schema object not found for ${schemaPath}`);
  }

  // Resolve $ref references in the schema, generate example, and validate it
  const resolvedSchema = resolveRefs(schema) as Record<string, unknown>;
  const example = JSON.stringify(
    OpenAPISampler.sample(resolvedSchema),
    null,
    2,
  );
  validateExample(example, schemaName);

  return example;
}

// #########################################################################
// Helper functions
// #########################################################################

function validateExample(example: string, schemaName: string): void {
  // Validate the generated example against the source schema
  const validator = ajv.getSchema(schemaName);
  if (!validator) {
    throw new Error(`Schema ${schemaName} not found for ${schemaName}`);
  }
  const isValid = validator(JSON.parse(example));
  if (!isValid) {
    // Convert AJV errors to a readable format
    const errors = (validator.errors || []).map(
      (error: {
        instancePath?: string;
        schemaPath?: string;
        message?: string;
        data?: unknown;
      }) => ({
        path: error.instancePath || error.schemaPath || "",
        message: error.message || "Validation failed",
        value: error.data,
      }),
    );

    // Log warning with error count
    console.warn(
      `Warning: Generated example for schema ${schemaName} failed validation (${errors.length} errors)`,
    );

    // Log first 3 errors for debugging
    if (errors.length > 0) {
      console.warn("Validation errors:", errors.slice(0, 3));
    }
  }
}

/**
 * Resolves $ref references in a schema by looking them up in AJV's schema registry
 * or in the schema's $defs section. This is needed because OpenAPISampler
 * doesn't automatically resolve $ref references.
 */
function resolveRefs(
  schema: unknown,
  visited = new Set<string>(),
  currentSchema?: Record<string, unknown>,
): unknown {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => resolveRefs(item, visited, currentSchema));
  }

  const schemaObj = schema as Record<string, unknown>;

  // On first call, use the schema itself as the current schema
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

    // Check if it's a $defs reference (starts with #/$defs/)
    if (refId.startsWith("#/$defs/")) {
      const defName = refId.replace("#/$defs/", "");
      // Use the current schema's $defs, not the root schema
      if (currentSchema.$defs && typeof currentSchema.$defs === "object") {
        const defs = currentSchema.$defs as Record<string, unknown>;
        if (defName in defs) {
          const resolvedSchema = resolveRefs(
            defs[defName],
            visited,
            currentSchema,
          );
          visited.delete(refId);
          return resolvedSchema;
        }
      }
    } else {
      // Look up the referenced schema in AJV
      const refValidator = ajv.getSchema(refId);
      if (refValidator && refValidator.schema) {
        // When resolving an external reference, use that schema as the new current schema
        const referencedSchema = refValidator.schema as Record<string, unknown>;
        const resolvedSchema = resolveRefs(
          referencedSchema,
          visited,
          referencedSchema,
        );
        visited.delete(refId);
        return resolvedSchema;
      }
    }

    visited.delete(refId);
    return schemaObj;
  }

  // Recursively resolve all properties
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schemaObj)) {
    // Preserve $defs in the current schema so OpenAPISampler can access them if needed
    if (key === "$defs" && schemaObj === currentSchema) {
      resolved[key] = value;
    } else if (key === "examples" && Array.isArray(value)) {
      // Preserve examples array but convert Date objects to strings
      // This prevents strings/numbers in examples from being converted to empty objects
      // and ensures Date objects are properly serialized
      resolved[key] = value.map((example) => {
        return example;
      });
    } else {
      resolved[key] = resolveRefs(value, visited, currentSchema);
    }
  }

  return resolved;
}
