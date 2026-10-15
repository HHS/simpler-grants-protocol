/** A data source an implementation draws on. */
export interface ImplementationSource {
  /** Human-readable source name (e.g. "Washington FundHub") */
  name: string;
  /** Link to the source, when it has a public page */
  url?: string;
}

/**
 * Implementation entry as stored in src/content/implementations/index.json
 * (source of truth), keyed by a URL-safe id, e.g. "simpler-grants".
 */
export interface ImplementationSourceEntry {
  /** Display name of the API (e.g. "Simpler.Grants.gov API") */
  name: string;
  /** Short description of what data the API serves */
  description: string;
  /** Short notice shown under the name, e.g. who runs it and who doesn't endorse it */
  note?: string;
  /** Organization that runs and maintains the API */
  maintainer: string;
  /** Funder scope the data covers (e.g. "Federal", "State", "Private") */
  scope: string[];
  /** Data sources the API draws on */
  sources: ImplementationSource[];
  /** CommonGrants routes served, as "METHOD /path" (e.g. "GET /common-grants/opportunities") */
  routes: string[];
  /** Base URL the CommonGrants routes are served from */
  apiUrl: string;
  /** Public documentation or OpenAPI spec */
  docsUrl: string;
  /** Public source repository, when the code is open source */
  sourceUrl?: string;
  /** SPDX license identifier for the source code (e.g. "MIT") */
  license?: string;
  /** How to authenticate, e.g. "None" or "Free API key" */
  auth: string;
  /** Where to sign up for access, when auth is required */
  authUrl?: string;
  /** How often the API refreshes from its source (e.g. "Daily") */
  refresh?: string;
  /** Custom field IDs from the custom fields catalog */
  customFields?: string[];
  /** Custom fields specific to this implementation, not in the catalog */
  sourceSpecificFields?: string[];
  /** Custom filter names accepted by the search route */
  customFilters?: string[];
  /** Plugin IDs from the plugins catalog that work with this API */
  plugins?: string[];
}

/** A plugin reference resolved against the plugins catalog. */
export interface ResolvedImplementationPlugin {
  id: string;
  label: string;
}

/** A catalog custom field, with its deprecation notice when it has one. */
export interface ResolvedImplementationField {
  id: string;
  /** Deprecation note from the catalog, when the field is deprecated */
  deprecatedNote?: string;
}

/** A custom filter resolved against the filters its plugins declare. */
export interface ResolvedImplementationFilter {
  name: string;
  /** Filter description from the plugin, when a linked plugin declares it */
  description?: string;
  /** Link to the filter type's protocol docs, when known */
  docsHref?: string;
}

/** A fully resolved implementation: source metadata plus derived fields. */
export interface Implementation extends ImplementationSourceEntry {
  id: string;
  /** Data-type tags derived from the routes (e.g. "Opportunities", "Awards") */
  tags: string[];
  /** Plugins resolved to their catalog labels */
  resolvedPlugins: ResolvedImplementationPlugin[];
  /** Custom filters resolved against the linked plugins' declarations */
  resolvedFilters: ResolvedImplementationFilter[];
  /** Catalog custom fields, with any deprecation notice from the catalog */
  resolvedFields: ResolvedImplementationField[];
}

/** Filter dropdown options returned by getFilterOptions(). */
export interface ImplementationFilterOptions {
  tags: string[];
  scopes: string[];
  maintainers: string[];
}
