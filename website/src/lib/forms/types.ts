import type { CatalogItem } from "../catalog";

/**
 * Metadata stored in the forms typespec-index.json.
 */
export interface FormItemIndexEntry {
  /** Schema name (used to load the emitted JSON schema) */
  schema: string;
  /** Human-readable label for display in cards and page titles */
  label: string;
}

/**
 * Data extracted from the JSON schema (emitted from TypeSpec).
 *
 * Mirrors QuestionBankSchemaData so consumers familiar with that loader
 * can navigate the forms loader without relearning shapes.
 */
export interface FormItemSchemaData {
  /** Form name (from schema title) */
  name: string;
  /** Form description */
  description: string;
  /** Tags (x-tags) for catalog filtering; empty when the spec omits them */
  tags: string[];
  /** Schema properties */
  properties: Record<string, unknown>;
  /** Example values */
  examples: unknown[];
  /** Mapping from CommonGrants paths to form fields */
  mappingFromCg: Record<string, unknown>;
  /** Mapping from form fields to CommonGrants paths */
  mappingToCg: Record<string, unknown>;
  /** JSON Forms UI schema */
  uiSchema: Record<string, unknown>;
  /** Full JSON schema object */
  rawSchema: Record<string, unknown>;
}

/**
 * Complete form item: index metadata + schema-derived fields.
 */
export interface FormItem
  extends FormItemIndexEntry,
    FormItemSchemaData,
    CatalogItem {
  /** The form's unique identifier (key in typespec-index.json) */
  id: string;
}

/**
 * Map of form ID to form item data.
 */
export type FormItemMap = Record<string, FormItem>;
