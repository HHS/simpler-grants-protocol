import type { VerticalLayout, JsonSchema } from "@jsonforms/core";
import type { FormSchemaMap, FormSchema, FormData } from "./types";
import formsIndex from "@/content/forms/index.json";

// Import all form files using Vite's glob pattern
// Implementation Notes:
// Vite DOESN'T allow the following patterns to make this more dynamic
// - Loading data from the filesystem with a dynamically constructed filepath
// - Using dynamic imports
// - Passing a templated string to the glob() command
// Summary:
// The glob pattern seems to be the most efficient way to load all form files
// without having to explicitly list each each file we're importing
const formSchemas = import.meta.glob("@/content/forms/*/json-schema.json", {
  eager: true,
}) as Record<string, { default: FormSchema }>;

const formUIs = import.meta.glob("@/content/forms/*/ui-schema.json", {
  eager: true,
}) as Record<string, { default: VerticalLayout }>;

const formMappingsTo = import.meta.glob(
  "@/content/forms/*/mapping-to-cg.json",
  { eager: true },
) as Record<string, { default: FormSchema }>;

const formMappingsFrom = import.meta.glob(
  "@/content/forms/*/mapping-from-cg.json",
  { eager: true },
) as Record<string, { default: FormSchema }>;

const formDefaultData = import.meta.glob(
  "@/content/forms/*/default-data.json",
  { eager: true },
) as Record<string, { default: FormData }>;

/**
 * Recursively count all properties in a JSON schema
 */
function countSchemaProperties(schema: JsonSchema): number {
  if (!schema || typeof schema !== "object") {
    return 0;
  }

  let count = 0;

  // If it has properties, count them
  if (schema.properties) {
    for (const [, propSchema] of Object.entries(schema.properties)) {
      // Count non-object properties (leaves) like strings, numbers, booleans, etc.
      if (typeof propSchema !== "object" || propSchema === null) {
        count += 1;
        continue;
      }

      // For object properties, only count if they don't have nested properties
      if (!propSchema.properties) {
        count += 1;
        continue;
      }

      // Finally, recursively count nested properties
      count += countSchemaProperties(propSchema);
    }
  }

  return count;
}

/**
 * Count mapped fields in the mapping-from-cg object
 */
function countMappedFields(mappingFromCommon: Record<string, unknown>): number {
  let count = 0;

  function countInObject(obj: unknown): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    for (const value of Object.values(obj)) {
      // Skip non-object values
      if (typeof value !== "object" || value === null) {
        continue;
      }

      // If it has a "field" property, it's a mapped field
      if ("field" in value) {
        count++;
        continue;
      }

      // Recursively check nested objects
      countInObject(value);
    }
  }

  countInObject(mappingFromCommon);
  return count;
}

/**
 * Loads form data using Vite's glob imports - very efficient for 100+ forms
 */
function loadFormDataWithGlob(formId: string, formLabel: string): FormSchema {
  // Use the actual path format that glob imports generate (with /src/ instead of @/)
  const formDir = `/src/content/forms/${formId}`;
  // Find the files in the glob imports using the expected path format
  const schemaPath = `${formDir}/json-schema.json`;
  const uiPath = `${formDir}/ui-schema.json`;
  const mappingToPath = `${formDir}/mapping-to-cg.json`;
  const mappingFromPath = `${formDir}/mapping-from-cg.json`;
  const defaultDataPath = `${formDir}/default-data.json`;

  const schema = formSchemas[schemaPath] as { default: FormSchema };
  const ui = formUIs[uiPath] as { default: VerticalLayout };
  const mappingTo = formMappingsTo[mappingToPath] as { default: FormSchema };
  const mappingFrom = formMappingsFrom[mappingFromPath] as {
    default: FormSchema;
  };
  const defaultData = formDefaultData[defaultDataPath] as { default: FormData };

  if (!schema || !ui || !mappingTo || !mappingFrom || !defaultData) {
    throw new Error(`Missing required files for form ${formId}`);
  }

  // Get metadata from forms index
  const formInfo = formsIndex.find((form) => form.id === formId);
  if (!formInfo) {
    throw new Error(`Form metadata not found for ${formId}`);
  }

  // Calculate statistics
  const totalQuestions = countSchemaProperties(schema.default);
  const mappedQuestions = countMappedFields(mappingFrom.default);
  const mappingPercentage =
    totalQuestions > 0
      ? Math.round((mappedQuestions / totalQuestions) * 100)
      : 0;

  return {
    id: formId,
    label: formLabel,
    description: formInfo.description || "",
    owner: formInfo.owner || "Unknown",
    url: formInfo.url && formInfo.url.length > 0 ? formInfo.url : undefined,
    formSchema: schema.default,
    formUI: ui.default,
    mappingToCommon: mappingTo.default,
    mappingFromCommon: mappingFrom.default,
    defaultData: defaultData.default,
    statistics: {
      totalQuestions,
      mappedQuestions,
      mappingPercentage,
    },
  };
}

/**
 * Load all schemas using glob imports - very fast for 100+ forms
 */
export function loadSchemasWithGlob(): FormSchemaMap {
  const schemas: FormSchemaMap = {};

  for (const form of formsIndex) {
    try {
      const formData = loadFormDataWithGlob(form.id, form.title);
      schemas[form.id] = formData;
    } catch (error) {
      console.error(`Failed to load schema for form ${form.id}:`, error);
      throw error;
    }
  }

  return schemas;
}

export const schemas = loadSchemasWithGlob();
