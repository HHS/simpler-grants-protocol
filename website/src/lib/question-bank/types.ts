import type { CatalogItem } from "../catalog";

/**
 * Metadata stored in the question-bank index.json.
 */
export interface QuestionBankIndexEntry {
  /** Schema name (used to load the emitted JSON schema) */
  schema: string;
  /** Human-readable label for display in cards and page titles */
  label: string;
}

/**
 * Data extracted from the JSON schema (emitted from TypeSpec).
 */
export interface QuestionBankSchemaData {
  /** Question name (from schema title) */
  name: string;
  /** Question description */
  description: string;
  /** Tags (x-tags) for categorization by field type */
  tags: string[];
  /** Entity roles (x-entity) for categorization by semantic context */
  entity: string[];
  /** Schema properties */
  properties: Record<string, unknown>;
  /** Example values */
  examples: unknown[];
  /** Mapping from CommonGrants paths to question fields */
  mappingFromCg: Record<string, unknown>;
  /** Mapping from question fields to CommonGrants paths */
  mappingToCg: Record<string, unknown>;
  /** JSON Forms UI schema */
  uiSchema: Record<string, unknown>;
  /** Full JSON schema object */
  rawSchema: Record<string, unknown>;
}

/** Filter dropdown options returned by getFilterOptions() */
export interface QuestionBankFilterOptions {
  tags: string[];
  entities: string[];
}

/**
 * Complete question bank item: index metadata + schema-derived fields.
 */
export interface QuestionBankItem
  extends QuestionBankIndexEntry,
    QuestionBankSchemaData,
    CatalogItem {
  /** The question's unique identifier (key in index.json) */
  id: string;
}

/**
 * Map of question bank ID to question bank item data
 */
export type QuestionBankMap = Record<string, QuestionBankItem>;
