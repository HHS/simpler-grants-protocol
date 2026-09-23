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

/**
 * Schema IDs registered on each instance, for error messages.
 *
 * Keyed per instance rather than module-wide so that a validator built from
 * synthetic schemas cannot overwrite the id list the production instance
 * reports.
 */
const schemaIdsByInstance = new WeakMap<Ajv2020, string[]>();

/** The path to the TypeSpec-generated schema bundle the harness compares against. */
const DEFAULT_SCHEMAS_PATH = path.resolve(
  __dirname,
  "../../tsp-output/@typespec/json-schema/schemas.yaml"
);

/**
 * Verifies that `format` keywords are actually enforced on an AJV instance.
 *
 * Much of the protocol contract lives in `format` (`uuid`, `uri`, `date-time`),
 * and AJV treats an unenforced format as a no-op rather than an error. Drop
 * `addFormats`, or flip `validateFormats`, and every one of those constraints
 * silently starts accepting anything — while the parity harness still reports
 * that the SDK matches the protocol. Nothing else in the suite would notice, so
 * the setup asserts it up front. Each format is probed on its own, because
 * ajv-formats registers them one at a time: a list narrowed to `uuid` leaves
 * `uri` and `date-time` inert while a uuid-only probe still passes.
 *
 * @param ajv - The instance to check
 * @param source - Where its schemas came from, used in the error message
 */
export function assertFormatValidationActive(ajv: Ajv2020, source: string): void {
  const probes: Array<[format: string, invalid: string]> = [
    ["uuid", "not-a-uuid"],
    ["uri", "not a uri"],
    ["date-time", "not-a-date-time"],
  ];

  for (const [format, invalid] of probes) {
    // No $id, so nothing is registered and there is nothing to clean up. A throw
    // from compile() is already loud, so it is left to propagate as-is.
    const probe = ajv.compile({ type: "string", format });

    if (probe(invalid) === true) {
      throw new Error(
        `Format validation is not active for schemas from ${source}: ` +
          `the string "${invalid}" validated against { format: "${format}" }. ` +
          `Check that ajv-formats is registered for every format and validateFormats ` +
          `is enabled — without it the harness compares nothing for ${format} fields.`
      );
    }
  }
}

/**
 * Creates an AJV instance from an in-memory map of schema definitions.
 *
 * This is the single construction path: `createAjvValidator` reads the bundled
 * YAML and delegates here, so a validator built from synthetic schemas in a test
 * gets exactly the same AJV options and format registration as the production
 * one, and the harness's own regression tests exercise the real setup.
 *
 * @param defs - Schema definitions, keyed by name (the shape of the bundle's `$defs`)
 * @param source - Where the definitions came from, used in error messages
 * @returns An AJV instance with every definition registered and format validation verified
 */
export function createAjvFromDefs(defs: Record<string, unknown>, source: string): Ajv2020 {
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

  const schemaIds: string[] = [];
  schemaIdsByInstance.set(ajv, schemaIds);

  // Add each schema from $defs to AJV
  // Each schema has its own $id, so we use that as the schema identifier
  for (const [schemaName, schema] of Object.entries(defs)) {
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

  assertFormatValidationActive(ajv, source);

  return ajv;
}

/**
 * Creates an AJV instance with all schemas from the bundled schemas.yaml file loaded.
 *
 * @param schemasPath - Optional path to the schemas.yaml file. Defaults to the bundled schema file.
 * @returns An AJV instance with all schemas loaded and ready for validation
 */
export function createAjvValidator(schemasPath?: string): Ajv2020 {
  const schemaFile = schemasPath || DEFAULT_SCHEMAS_PATH;

  // The bundle is TypeSpec output, so an absent file nearly always means it has
  // not been generated yet. A bare ENOENT sends the reader looking for a source
  // file that was never checked in.
  if (!fs.existsSync(schemaFile)) {
    throw new Error(
      `Could not find the reference schema bundle at ${schemaFile}. ` +
        `It is generated from TypeSpec — run \`pnpm build\` in lib/ts-sdk to produce it.`
    );
  }

  // Load and parse the YAML schema file
  const schemaContent = fs.readFileSync(schemaFile, "utf-8");

  const schemaBundle = yaml.load(schemaContent) as {
    $defs?: Record<string, unknown>;
  };

  if (!schemaBundle.$defs) {
    throw new Error(`Schema file ${schemaFile} does not contain $defs with schemas`);
  }

  return createAjvFromDefs(schemaBundle.$defs, schemaFile);
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
    const schemaIds = schemaIdsByInstance.get(ajv) ?? [];
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

export const ajv = createAjvValidator();
