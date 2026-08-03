/**
 * The filter types a plugin may declare. Mirrors CustomFilterType in
 * lib/ts-sdk/src/extensions/types.ts — keep the two in sync.
 */
export const CUSTOM_FILTER_TYPES = [
  "stringComparison",
  "stringArray",
  "numberComparison",
  "numberArray",
  "numberRange",
  "booleanComparison",
  "dateComparison",
  "dateRange",
  "moneyComparison",
  "moneyRange",
] as const;

export type CustomFilterType = (typeof CUSTOM_FILTER_TYPES)[number];

/**
 * A single filter as declared in index.json, keyed by filter name.
 * Operators are derived from filterType by the SDK, never authored here.
 */
export interface PluginFilterSpec {
  filterType: CustomFilterType;
  /** Authored for the website; plugins declare filterType only */
  description?: string;
}

/**
 * Filter declarations nested resource -> method -> filter name.
 *
 * A catalog shape, not either SDK's authoring shape: the TS SDK wraps the
 * filter map in a `filters` key, and the Python SDK puts a TypedDict class in
 * the method slot. Copy a plugin's routes declaration here verbatim and its
 * filters are skipped as unknown.
 */
export type PluginFilterDeclarations = Record<
  string,
  Record<string, Record<string, PluginFilterSpec>>
>;

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
  /** Omitted entirely by plugins that declare no custom filters */
  filters?: PluginFilterDeclarations;
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
 * A single custom filter flattened out of the nested declarations.
 */
export interface ResolvedPluginFilter {
  /** The filter's name (key in the declarations) */
  name: string;
  filterType: CustomFilterType;
  description: string;
  /** Resource the filter attaches to (e.g. "opportunities") */
  resource: string;
  /** Route method the filter attaches to (e.g. "search") */
  method: string;
  /** Docs link for the filter type; see filter-docs.ts */
  docsHref: string;
}

/**
 * A fully resolved plugin: cache metadata + joined field definitions.
 */
export interface Plugin extends PluginCacheEntry {
  /** The plugin's unique identifier (key in index.json) */
  id: string;
  /** Field definitions resolved from the custom-fields catalog */
  resolvedFields: ResolvedPluginField[];
  /** Filters flattened from the entry's nested declarations */
  resolvedFilters: ResolvedPluginFilter[];
}
