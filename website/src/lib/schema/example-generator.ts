import { ajv } from "../validation";
import { resolveSchemaRefs } from "./ref-resolver";
import { Paths } from "./paths";
import * as path from "path";
import * as OpenAPISampler from "openapi-sampler";

/**
 * Generates a sample example for a given schema path.
 * @param schemaPath - Path to the schema file, relative to the repo root
 *   (e.g. "website/public/schemas/yaml/OpportunityBase.yaml").
 * @returns The generated example as a JSON string.
 */
export async function generateSchemaExample(
  schemaPath: string,
): Promise<string> {
  const filePath = path.resolve(Paths.REPO_ROOT, schemaPath);
  const schemaName = path.basename(filePath);

  // Resolve $ref references in the schema, generate example, and validate it
  const resolvedSchema = await resolveSchemaRefs(filePath);
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
