import type { CatalogItem } from "../catalog";

/**
 * A node in a JSON-Forms UI schema tree (Control or Layout).
 *
 * Controls have a `scope` pointing at a JSON Schema property path.
 * Layouts (Group, VerticalLayout, HorizontalLayout, etc.) have an
 * `elements` array containing child nodes. Both may carry additional
 * keys like `label`, `rule`, or `options`.
 *
 * Used by `compose.ts` (to re-scope Controls when lifting a child
 * question's UI schema into a parent form) and by `overrides.ts`
 * (to walk the tree and patch Controls by scope).
 */
export type UiNode = Record<string, unknown> & {
  type?: string;
  scope?: string;
  elements?: UiNode[];
};

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
 * Per-path override map keyed by dotted property path.
 *
 * Each value is a partial patch: for UI overrides it overwrites named
 * keys on the matching JSON-Forms Control (e.g. `{ label: "..." }`); for
 * mapping overrides it replaces the entire field entry under that path.
 *
 * In TypeSpec, dotted paths are written with backticks, e.g.
 * `` `org.name`: #{ label: "..." } ``, since identifiers without backticks
 * cannot contain dots.
 */
export type OverrideMap = Record<string, Record<string, unknown>>;

/**
 * Per-form override block read from the schema's `x-overrides` extension.
 *
 * Lets a form patch individual labels / mappings without re-declaring the
 * full base UI schema or mapping inherited from composed QB questions.
 */
export interface FormOverrides {
  uiSchema?: OverrideMap;
  mappingFromCg?: OverrideMap;
  mappingToCg?: OverrideMap;
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
  /** Mapping from CommonGrants paths to form fields, with x-overrides applied */
  mappingFromCg: Record<string, unknown>;
  /** Mapping from form fields to CommonGrants paths, with x-overrides applied */
  mappingToCg: Record<string, unknown>;
  /** JSON Forms UI schema, with x-overrides applied */
  uiSchema: Record<string, unknown>;
  /** Raw x-overrides block (kept for inspection / debugging; merge is already applied above) */
  overrides: FormOverrides;
  /** Full JSON schema object */
  rawSchema: Record<string, unknown>;
}

/**
 * Complete form item: index metadata + schema-derived fields.
 */
export interface FormItem
  extends FormItemIndexEntry, FormItemSchemaData, CatalogItem {
  /** The form's unique identifier (key in typespec-index.json) */
  id: string;
}

/**
 * Map of form ID to form item data.
 */
export type FormItemMap = Record<string, FormItem>;
