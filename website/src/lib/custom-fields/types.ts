/**
 * Metadata stored in the custom-fields index.json
 */
export interface CustomFieldIndexEntry {
  /** Path to the JSON schema file */
  schema: string;
  /** Schema models this custom field is valid for */
  validFor: string[];
  /** Searchable tags */
  tags: string[];
  /** Author or maintainer */
  author: string;
  /** Semantic version */
  version: string;
  /** ISO date string when the field was created */
  createdAt: string;
  /** ISO date string when the field was last modified */
  lastModifiedAt: string;
}

/**
 * Data extracted from the JSON schema file
 */
export interface CustomFieldSchemaData {
  /** Field name (from schema const) */
  name: string;
  /** Field description */
  description: string;
  /** JSON schema field type (string, number, object, etc.) */
  fieldType: string;
  /** Example values */
  examples: unknown[];
  /** Full JSON schema object */
  rawSchema: Record<string, unknown>;
}

/**
 * Complete custom field data (index + schema)
 */
export interface CustomField
  extends CustomFieldIndexEntry,
    CustomFieldSchemaData {
  /** The field's unique identifier (key in index.json) */
  id: string;
}

/**
 * Map of custom field ID to custom field data
 */
export type CustomFieldMap = Record<string, CustomField>;

/** Filter dropdown options returned by getFilterOptions() */
export interface FilterOptions {
  tags: string[];
  schemas: string[];
  authors: string[];
}
