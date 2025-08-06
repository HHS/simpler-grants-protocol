import type { JsonValue } from "./types";
import type { JsonSchema } from "@jsonforms/core";
import { transformWithMapping } from "./transformation";
import Ajv from "ajv";

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

// Create an Ajv instance with common options
const ajv = new Ajv({
  allErrors: true, // Return all errors, not just the first one
  verbose: true, // Include more detailed error information
  strict: false, // Allow additional properties not in schema
});

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
 *
 * It does this by:
 * 1. Transforming the form data to CommonGrants using the form's `mappingToCommon` attribute
 * 2. Validating the CommonGrants data against the CommonGrants schema
 * 3. Transforming the CommonGrants data back using the form's `mappingFromCommon` attribute
 * 4. Validating the final transformation output against the form schema
 *
 * It logs any validation warnings to the console.
 *
 */
export function validateCommonGrantsMappings(
  props: CommonGrantsValidationProps,
) {
  // 1. Transform the form data to CommonGrants
  const commonData = transformWithMapping(
    props.defaultData,
    props.mappingToCommon,
  );

  // 2. Validate the CommonGrants data against the CommonGrants schema
  const mappingToCommon = validateAgainstSchema(commonData, {});
  if (!mappingToCommon.isValid) {
    console.warn(
      `${props.formId}: Failed mapping to CommonGrants`,
      mappingToCommon.errors,
    );
  }

  // 3. Transform the CommonGrants data back to the form data
  const transformedData = transformWithMapping(
    commonData,
    props.mappingFromCommon as Record<string, JsonValue>,
  );

  // 4. Validate the final transformation output against the form schema
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
