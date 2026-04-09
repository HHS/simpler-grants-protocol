/**
 * A single custom field definition from the shared fields map in index.json.
 */
export interface PluginFieldEntry {
  fieldType: string;
  supportedObjects: string[];
}

/** Map of field name to field definition */
export type PluginFieldMap = Record<string, PluginFieldEntry>;

/**
 * Metadata for a plugin as stored in index.json.
 */
export interface PluginIndexEntry {
  label: string;
  url: string;
  language: string;
  fields: Array<keyof PluginFieldMap>;
}

/**
 * A resolved plugin: index metadata + joined field definitions.
 */
export interface Plugin extends PluginIndexEntry {
  /** The plugin's unique identifier (key in index.json) */
  id: string;
  /** Field definitions resolved from the shared fields map */
  resolvedFields: (PluginFieldEntry & { name: string })[];
}
