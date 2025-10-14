import type { JsonValue } from "./types";
import type { JsonSchema } from "@jsonforms/core";
import { transformWithMapping } from "./transformation";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./paths";

// #########################################################
// CommonGrants schema and validator
// #########################################################

const ajv = createAjvWithSchemas();
const commonGrantsSchema = ajv.getSchema("ProposalBase.yaml")
  ?.schema as JsonSchema;

// #########################################################
// Validation types
// #########################################################

/**
 * Validation error details
 */
interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Validation result containing success status and any errors
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface CommonGrantsValidationProps {
  formId: string;
  formSchema: JsonSchema;
  mappingToCommon: Record<string, JsonValue>;
  mappingFromCommon: Record<string, JsonValue>;
  defaultData: Record<string, JsonValue>;
}

// #########################################################
// Validator
// #########################################################

/**
 * Loads all YAML schema files and creates an Ajv instance ready for validation
 * This is the main function to use for schema validation
 */
export function createAjvWithSchemas(): Ajv2020 {
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

  // Load all YAML schema files from the yaml directory
  const yamlDir = path.resolve(process.cwd(), Paths.SCHEMAS_DIR);
  const files = fs
    .readdirSync(yamlDir)
    .filter((file) => file.endsWith(".yaml"));

  for (const file of files) {
    const filePath = path.join(yamlDir, file);
    const schemaContent = fs.readFileSync(filePath, "utf-8");
    const schema = yaml.load(schemaContent) as JsonSchema & { $id?: string };

    // Ensure the schema has an $id that matches the filename
    if (!schema.$id) {
      schema.$id = file;
    }

    // Register the schema with Ajv using the $id as the schema ID
    ajv.addSchema(schema, schema.$id);
  }

  return ajv;
}

// #########################################################
// Validation functions
// #########################################################

/**
 * Validates data against a JSON schema using Ajv
 */
function validateAgainstSchema(
  data: unknown,
  schema: JsonSchema,
): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const isValid = validate(data);

    if (isValid) {
      return {
        isValid: true,
        errors: [],
      };
    }

    // Convert Ajv errors to our ValidationError format
    const errors: ValidationError[] = (validate.errors || []).map((error) => ({
      path: error.instancePath || error.schemaPath || "",
      message: error.message || "Validation failed",
      value: error.data,
    }));

    return {
      isValid: false,
      errors,
    };
  } catch (error) {
    // If Ajv compilation fails, return a validation error
    return {
      isValid: false,
      errors: [
        {
          path: "",
          message: `Schema compilation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Validates the mappings between a form and the CommonGrants data model
 */
export async function validateCommonGrantsMappings(
  props: CommonGrantsValidationProps,
): Promise<void> {
  // Transform the form data to CommonGrants using the form's `mappingToCommon` attribute
  // Then validate the CommonGrants data against the CommonGrants schema
  const commonData = transformWithMapping(
    props.defaultData,
    props.mappingToCommon,
  );
  const mappingToCommon = validateAgainstSchema(commonData, commonGrantsSchema);
  if (!mappingToCommon.isValid) {
    console.warn(
      `${props.formId}: Failed mapping to CommonGrants`,
      mappingToCommon.errors,
    );
  }

  // Transform the CommonGrants data back to the form data using the form's `mappingFromCommon` attribute
  // Then validate the transformed data against the form schema
  const transformedData = transformWithMapping(
    commonData,
    props.mappingFromCommon as Record<string, JsonValue>,
  );
  const mappingFromCommon = validateAgainstSchema(
    transformedData,
    props.formSchema,
  );
  if (!mappingFromCommon.isValid) {
    console.warn(
      `${props.formId}: Failed mapping from CommonGrants`,
      mappingFromCommon.errors,
    );
  }
}
