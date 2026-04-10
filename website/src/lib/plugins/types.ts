/**
 * Plugin entry as stored in src/content/plugins/index.json (source of truth).
 * Maintainers edit this file; url/language/version are fetched at build time.
 */
export interface PluginSourceEntry {
  label: string;
  description: string;
  system: string;
  /** Name of the package on npm or PyPI (e.g. "@common-grants/cg-grants-gov") */
  packageName: string;
  /** URL to the plugin's npm or PyPI package page */
  packageUrl: string;
  /** Optional fallback repo URL if the package registry doesn't provide one */
  repoUrl?: string;
  fields: Record<string, string[]>;
}

/**
 * Plugin entry as written to cache/plugin-metadata.json by the build script.
 * Extends the source entry with metadata fetched from the package registry.
 */
export interface PluginCacheEntry extends PluginSourceEntry {
  /** Repository URL fetched from the package registry */
  url: string;
  /** Programming language inferred from the package registry */
  language: string;
  /** Latest published version fetched from the package registry */
  version: string;
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
 * A fully resolved plugin: cache metadata + joined field definitions.
 */
export interface Plugin extends PluginCacheEntry {
  /** The plugin's unique identifier (key in index.json) */
  id: string;
  /** Field definitions resolved from the custom-fields catalog */
  resolvedFields: ResolvedPluginField[];
}
