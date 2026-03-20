import { Paths } from "../schema/paths";
import {
  schemaFilePath,
  collectUniqueValues,
  extractFromSchema,
  getString,
  getStringArray,
  getPropertyConst,
  getPropertyExamples,
} from "../catalog";
import * as fs from "fs";
import * as yaml from "js-yaml";
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

/** Loads a raw schema by name from the extension schemas directory */
function loadSchema(schemaName: string): Record<string, unknown> | null {
  const filePath = schemaFilePath(schemaName);

  if (!fs.existsSync(filePath)) {
    console.warn(
      `Schema ${schemaName} not found in ${Paths.EXTENSION_SCHEMAS_DIR}`,
    );
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content) as Record<string, unknown>;
}

/**
 * Extracts custom field data from a JSON schema.
 *
 * Custom field schemas store name, description, and fieldType as `const`
 * values in nested properties, while metadata like tags, version, and
 * valid schemas are top-level x-* extensions.
 */
function extractSchemaData(
  schema: Record<string, unknown>,
): CustomFieldSchemaData {
  return {
    ...extractFromSchema(schema, {
      name: getPropertyConst("name"),
      description: getPropertyConst("description"),
      fieldType: getPropertyConst("fieldType"),
      examples: getPropertyExamples("value"),
      tags: getStringArray("x-tags"),
      version: getString("x-version"),
      validFor: getStringArray("x-valid-schemas"),
      author: getString("x-author"),
    }),
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

  return {
    tags: collectUniqueValues(allFields, (f) => f.tags),
    schemas: collectUniqueValues(allFields, (f) => f.validFor),
    authors: collectUniqueValues(allFields, (f) => (f.author ? [f.author] : [])),
    fieldTypes: collectUniqueValues(allFields, (f) =>
      f.fieldType ? [f.fieldType] : [],
    ),
  };
}
