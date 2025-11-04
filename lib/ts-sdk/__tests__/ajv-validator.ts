/**
 * AJV Validator Utility for Testing
 *
 * This utility loads the bundled JSON schemas from schemas.yaml and provides
 * an AJV instance that can be used to validate JSON inputs against the schemas.
 */

import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

// Store schema IDs for error messages
const schemaIds: string[] = [];

/**
 * Creates an AJV instance with all schemas from the bundled schemas.yaml file loaded.
 *
 * @param schemasPath - Optional path to the schemas.yaml file. Defaults to the bundled schema file.
 * @returns An AJV instance with all schemas loaded and ready for validation
 */
export function createAjvValidator(schemasPath?: string): Ajv2020 {
  // Default to the bundled schema file
  const defaultPath = path.resolve(__dirname, "../tsp-output/@typespec/json-schema/schemas.yaml");

  const schemaFile = schemasPath || defaultPath;

  // Create AJV instance (using Ajv2020 for Draft 2020-12 support)
  const ajv = new Ajv2020({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: true,
  });

  // Add format validators for standard JSON Schema formats
  // This adds support for: date, time, date-time, uuid, email, uri, and more
  addFormats(ajv);

  // Load and parse the YAML schema file
  const schemaContent = fs.readFileSync(schemaFile, "utf-8");
  const schemaBundle = yaml.load(schemaContent) as {
    $defs?: Record<string, unknown>;
  };

  if (!schemaBundle.$defs) {
    throw new Error(`Schema file ${schemaFile} does not contain $defs with schemas`);
  }

  // Clear and rebuild schema IDs list
  schemaIds.length = 0;

  // Add each schema from $defs to AJV
  // Each schema has its own $id, so we use that as the schema identifier
  for (const [schemaName, schema] of Object.entries(schemaBundle.$defs)) {
    const schemaObj = schema as { $id?: string };

    // Use the $id from the schema if available, otherwise use the key name
    const schemaId = schemaObj.$id || schemaName;

    // Add the schema to AJV
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ajv.addSchema(schema as any, schemaId);
    schemaIds.push(schemaId);

    // Also add it with the schema name as an alias for convenience
    if (schemaId !== schemaName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ajv.addSchema(schema as any, schemaName);
      schemaIds.push(schemaName);
    }
  }

  return ajv;
}

/**
 * Gets a compiled validator function for a specific schema.
 *
 * @param ajv - The AJV instance (from createAjvValidator)
 * @param schemaId - The schema ID (e.g., "uuid.yaml", "Address.yaml", "OpportunityBase.yaml")
 * @returns A compiled validate function
 */
export function getValidator(ajv: Ajv2020, schemaId: string): ValidateFunction {
  const validator = ajv.getSchema(schemaId);

  if (!validator) {
    const availableSchemas = schemaIds.length > 0 ? schemaIds.join(", ") : "none loaded";
    throw new Error(`Schema "${schemaId}" not found. Available schemas: ${availableSchemas}`);
  }

  return validator as ValidateFunction;
}

/**
 * Validates JSON data against a specific schema.
 *
 * @param ajv - The AJV instance (from createAjvValidator)
 * @param schemaId - The schema ID to validate against
 * @param data - The JSON data to validate
 * @returns An object with isValid boolean and errors array
 */
export function validate(
  ajv: Ajv2020,
  schemaId: string,
  data: unknown
): { isValid: boolean; errors: string[] | null } {
  const validator = getValidator(ajv, schemaId);
  const isValid = validator(data);

  if (isValid) {
    return { isValid: true, errors: null };
  }

  const errors = validator.errors || [];
  const errorMessages = errors.map(err => {
    const errorPath = err.instancePath || err.schemaPath || "";
    return `${errorPath}: ${err.message || "Validation failed"}`;
  });

  return { isValid: false, errors: errorMessages };
}
