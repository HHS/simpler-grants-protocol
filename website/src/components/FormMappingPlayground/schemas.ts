import type { FormSchemaMap, FormSchema } from "./types";
import formsIndex from "@/content/forms/index.json";

/**
 * Dynamically loads form data for a given form ID
 */
async function loadFormData(
  formId: string,
  formLabel: string
): Promise<FormSchema> {
  // Generate paths to the form data files
  const formDir = `../../content/forms/${formId}`;
  const schemaPath = `${formDir}/json-schema.json`;
  const uiPath = `${formDir}/ui-schema.json`;
  const mappingToPath = `${formDir}/mapping-to-cg.json`;
  const mappingFromPath = `${formDir}/mapping-from-cg.json`;
  const defaultDataPath = `${formDir}/default-data.json`;

  // Load the form data files
  try {
    const [schema, ui, mappingTo, mappingFrom, defaultData] = await Promise.all(
      [
        import(/* @vite-ignore */ schemaPath),
        import(/* @vite-ignore */ uiPath),
        import(/* @vite-ignore */ mappingToPath),
        import(/* @vite-ignore */ mappingFromPath),
        import(/* @vite-ignore */ defaultDataPath),
      ]
    );

    return {
      id: formId,
      label: formLabel,
      formSchema: schema.default,
      formUI: ui.default,
      mappingToCommon: mappingTo.default,
      mappingFromCommon: mappingFrom.default,
      defaultData: defaultData.default,
    };
  } catch (error) {
    throw new Error(`Error loading form data: ${error}`);
  }
}

/**
 * Dynamically generated schemas from the forms directory.
 * Each form is loaded from its corresponding subdirectory using the index.json as the source of truth.
 */
export async function loadSchemas(): Promise<FormSchemaMap> {
  const schemas: FormSchemaMap = {};

  for (const form of formsIndex) {
    try {
      const formData = await loadFormData(form.id, form.title);
      schemas[form.id] = formData;
    } catch (error) {
      console.error(`Failed to load schema for form ${form.id}:`, error);
      throw error;
    }
  }

  return schemas;
}

export const schemas = await loadSchemas();
