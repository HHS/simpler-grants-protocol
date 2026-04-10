import type { CatalogItem } from "../catalog";

/**
 * Metadata stored in the custom-fields index.json.
 * Only registry metadata lives here; tags, validFor, version, and author come from the JSON schema.
 */
export interface CustomFieldIndexEntry {
  /** Schema name (used to load the emitted JSON schema) */
  schema: string;
  /** ISO date string when the field was created */
  createdAt: string;
  /** ISO date string when the field was last modified */
  lastModifiedAt: string;
}

/**
 * Data extracted from the JSON schema (emitted from TypeSpec).
 */
export interface CustomFieldSchemaData {
  /** Field name (from schema const) */
  name: string;
  /** Field description */
  description: string;
  /** JSON schema field type */
  fieldType: string;
  /** Example values */
  examples: unknown[];
  /** Full JSON schema object */
  rawSchema: Record<string, unknown>;
  /** Tags (x-tags) */
  tags: string[];
  /** Version (x-version) */
  version: string;
  /** Valid schemas (x-valid-schemas) */
  validFor: string[];
  /** Author (x-author) */
  author: string;
}

/**
 * Complete custom field data: index metadata + schema-derived fields.
 */
export interface CustomField
  extends CustomFieldIndexEntry, CustomFieldSchemaData, CatalogItem {
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
  fieldTypes: string[];
}
