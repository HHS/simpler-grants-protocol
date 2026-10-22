import type { CustomField } from "@/lib/custom-fields";
import type { ResolvedPluginFilter } from "@/lib/plugins";

/** A custom field that isn't in the catalog, described in the entry itself. */
export interface SourceSpecificField {
  /** JSON schema type of the value: string, number, integer, boolean, object, or array */
  fieldType: string;
  /** What the field holds */
  description: string;
}

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
  /** Custom fields specific to this implementation, not in the catalog, keyed by name */
  sourceSpecificFields?: Record<string, SourceSpecificField>;
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

/** A fully resolved implementation: source metadata plus derived fields. */
export interface Implementation extends ImplementationSourceEntry {
  id: string;
  /** Data-type tags derived from the routes (e.g. "Opportunities", "Awards") */
  tags: string[];
  /** Plugins resolved to their catalog labels */
  resolvedPlugins: ResolvedImplementationPlugin[];
  /** Custom filters its linked plugins declare, in the plugin catalog's shape */
  resolvedFilters: ResolvedPluginFilter[];
  /** Custom filter names no linked plugin declares, shown without a card */
  unresolvedFilters: string[];
  /** Catalog custom fields, in the custom field catalog's shape */
  resolvedFields: CustomField[];
}

/** Filter dropdown options returned by getFilterOptions(). */
export interface ImplementationFilterOptions {
  tags: string[];
  scopes: string[];
  maintainers: string[];
}
