import type { JsonSchema } from "@jsonforms/core";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./schema/paths";

// #########################################################
// CommonGrants schema and validator
// #########################################################

/** Ajv instance loaded from Paths.SCHEMAS_DIR (base protocol schemas only) */
export const ajv = createAjvWithSchemas();
/** Ajv instance loaded from Paths.EXTENSION_SCHEMAS_DIR (custom fields + question bank), used for validation only */
export const extensionsAjv = createAjvWithSchemas({
  schemaDir: Paths.EXTENSION_SCHEMAS_DIR,
});

// #########################################################
// Validator
// #########################################################

/**
 * Options for createAjvWithSchemas. When schemaDir is provided, load from that
 * directory only. Otherwise load from Paths.SCHEMAS_DIR.
 */
export interface CreateAjvWithSchemasOptions {
  /** Absolute path to a directory of YAML schemas to load. */
  schemaDir?: string;
}

/**
 * Loads all YAML schema files from one directory and creates an Ajv instance.
 * Use the default (no options) for base protocol schemas; pass schemaDir for
 * custom field schemas or another single directory.
 */
export function createAjvWithSchemas(
  options?: CreateAjvWithSchemasOptions,
): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    verbose: true,
    strict: false,
    formats: {
      // Define any custom formats you want to support
      date: true, // Allow any string for date format
      "date-time": true, // Allow any string for date-time format
      time: true, // Allow any string for time format
      uuid: true, // Allow any string for uuid format
      email: true, // Allow any string for email format
      uri: true, // Allow any string for uri format
    },
  });

  const yamlDir =
    options?.schemaDir !== undefined ? options.schemaDir : Paths.SCHEMAS_DIR;

  if (!fs.existsSync(yamlDir)) {
    return ajv;
  }

  const entries = fs.readdirSync(yamlDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".yaml"))
    .map((e) => e.name);

  for (const file of files) {
    const filePath = path.join(yamlDir, file);
    const schemaContent = fs.readFileSync(filePath, "utf-8");
    const schema = yaml.load(schemaContent) as JsonSchema & {
      $id?: string;
      unevaluatedProperties?: unknown;
    };

    // Ensure the schema has an $id that matches the filename
    if (!schema.$id) {
      schema.$id = file;
    }

    // Strip unevaluatedProperties — TypeSpec generates `not: {}` on every
    // model, which causes AJV to flag defined properties as invalid on complex
    // schemas with $ref + sibling keywords.
    delete schema.unevaluatedProperties;

    // Register the schema with Ajv using the $id as the schema ID
    ajv.addSchema(schema, schema.$id);
  }

  return ajv;
}
