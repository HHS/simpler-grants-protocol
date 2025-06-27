import type { JsonSchema, VerticalLayout } from "@jsonforms/core";
import formsIndex from "../../content/forms/index.json";

export interface SchemaOption {
  id: string;
  label: string;
  formSchema: JsonSchema;
  formUI: VerticalLayout;
  defaultData: unknown;
  mappings: MappingSet;
}

interface MappingSet {
  mappingToCommon: Record<string, unknown>;
  mappingFromCommon: Record<string, unknown>;
}

/**
 * Dynamically loads form data for a given form ID
 */
async function loadFormData(
  formId: string,
  formLabel: string
): Promise<SchemaOption> {
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
      mappings: {
        mappingToCommon: mappingTo.default,
        mappingFromCommon: mappingFrom.default,
      },
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
export async function loadSchemas(): Promise<SchemaOption[]> {
  const schemas: SchemaOption[] = [];

  for (const form of formsIndex) {
    try {
      const formData = await loadFormData(form.id, form.title);
      schemas.push(formData);
    } catch (error) {
      console.error(`Failed to load schema for form ${form.id}:`, error);
      throw error;
    }
  }

  return schemas;
}

export const schemas = await loadSchemas();
