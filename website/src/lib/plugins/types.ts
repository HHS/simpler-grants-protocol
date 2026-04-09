/**
 * Metadata for a plugin as stored in index.json.
 */
export interface PluginIndexEntry {
  label: string;
  description: string;
  system: string;
  url: string;
  language: string;
  version: string;
  fields: string[];
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * A single custom field resolved from the custom-fields catalog.
 */
export interface ResolvedPluginField {
  /** The field's unique identifier (key in custom-fields index) */
  id: string;
  /** Human-readable field type (e.g. "integer", "string", "object") */
  fieldType: string;
  /** Schemas this field is valid for (e.g. ["Opportunity"]) */
  validFor: string[];
}

/**
 * A resolved plugin: index metadata + joined field definitions.
 */
export interface Plugin extends PluginIndexEntry {
  /** The plugin's unique identifier (key in index.json) */
  id: string;
  /** Field definitions resolved from the custom-fields catalog */
  resolvedFields: ResolvedPluginField[];
}
