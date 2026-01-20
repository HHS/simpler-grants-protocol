import { ajv } from "../validation";
import type {
  CustomField,
  CustomFieldIndexEntry,
  CustomFieldMap,
  CustomFieldSchemaData,
  FilterOptions,
} from "./types";

// Import the custom fields index
import customFieldsIndex from "@/content/custom-fields/index.json";

// =============================================================================
// PRIVATE HELPERS
// Internal functions for loading and parsing schemas
// =============================================================================

/** Cache for loaded custom fields */
let customFieldsCache: CustomFieldMap | null = null;

/** Loads a schema using AJV's schema registry */
function loadSchema(schemaName: string): Record<string, unknown> | null {
  // AJV schemas are registered with .yaml suffix
  const schemaId = schemaName.endsWith(".yaml")
    ? schemaName
    : `${schemaName}.yaml`;
  const validator = ajv.getSchema(schemaId);

  if (!validator?.schema) {
    console.warn(`Schema ${schemaId} not found in AJV registry`);
    return null;
  }

  return validator.schema as Record<string, unknown>;
}

/** Extracts custom field data from a JSON schema */
function extractSchemaData(
  schema: Record<string, unknown>
): CustomFieldSchemaData {
  const properties = schema.properties as Record<
    string,
    Record<string, unknown>
  >;

  // Extract name from const value
  const nameProperty = properties?.name;
  const name =
    typeof nameProperty?.const === "string" ? nameProperty.const : "";

  // Extract description from const value
  const descProperty = properties?.description;
  const description =
    typeof descProperty?.const === "string" ? descProperty.const : "";

  // Extract fieldType from const value
  const fieldTypeProperty = properties?.fieldType;
  const fieldType =
    typeof fieldTypeProperty?.const === "string"
      ? fieldTypeProperty.const
      : "";

  // Extract examples from value property
  const valueProperty = properties?.value;
  const examples = Array.isArray(valueProperty?.examples)
    ? valueProperty.examples
    : [];

  return {
    name,
    description,
    fieldType,
    examples,
    rawSchema: schema,
  };
}

// =============================================================================
// CORE LOADERS
// Used by: index.astro, [slug].astro
// Primary functions for loading custom field data
// =============================================================================

/**
 * Loads a single custom field by ID
 * @param fieldId - The unique identifier for the custom field
 * @returns The custom field data or null if not found
 */
export function loadCustomField(fieldId: string): CustomField | null {
  const indexEntry = (
    customFieldsIndex as Record<string, CustomFieldIndexEntry>
  )[fieldId];

  if (!indexEntry) {
    return null;
  }

  try {
    const schema = loadSchema(indexEntry.schema);
    if (!schema) {
      return null;
    }

    const schemaData = extractSchemaData(schema);

    return {
      id: fieldId,
      ...indexEntry,
      ...schemaData,
    };
  } catch (error) {
    console.error(`Failed to load custom field ${fieldId}:`, error);
    return null;
  }
}

/**
 * Loads all custom fields from the index (with caching)
 * @returns Map of field ID to custom field data
 */
export function loadAllCustomFields(): CustomFieldMap {
  if (customFieldsCache) {
    return customFieldsCache;
  }

  const fields: CustomFieldMap = {};
  const index = customFieldsIndex as Record<string, CustomFieldIndexEntry>;

  for (const fieldId of Object.keys(index)) {
    const field = loadCustomField(fieldId);
    if (field) {
      fields[fieldId] = field;
    }
  }

  customFieldsCache = fields;
  return fields;
}

// =============================================================================
// STATIC PATH GENERATION
// Used by: [slug].astro (getStaticPaths)
// Functions for generating static routes
// =============================================================================

/**
 * Gets all custom field IDs for static path generation
 * @returns Array of all custom field IDs
 */
export function getCustomFieldIds(): string[] {
  return Object.keys(customFieldsIndex);
}

// =============================================================================
// FILTER DROPDOWN OPTIONS
// Used by: index.astro
// Functions to populate filter dropdowns in the registry UI
// =============================================================================

/**
 * Gets all unique filter options for dropdowns
 * @returns Object containing sorted arrays of unique tags, schemas, and authors
 */
export function getFilterOptions(): FilterOptions {
  const allFields = loadAllCustomFields();

  const tagSet = new Set<string>();
  const schemaSet = new Set<string>();
  const authorSet = new Set<string>();

  for (const field of Object.values(allFields)) {
    // Collect tags
    for (const tag of field.tags) {
      tagSet.add(tag);
    }
    // Collect validFor schemas
    for (const schema of field.validFor) {
      schemaSet.add(schema);
    }
    // Collect authors
    authorSet.add(field.author);
  }

  return {
    tags: Array.from(tagSet).sort(),
    schemas: Array.from(schemaSet).sort(),
    authors: Array.from(authorSet).sort(),
  };
}
