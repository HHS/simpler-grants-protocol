/** Classification of the registry that issues an identifier. */
export type RegistryKind = "government" | "commercial" | "platform" | "system";

/**
 * Whether the registry is a base identifier on a model or a catalog-only
 * extension that lives under `otherIds`.
 */
export type RegistryStatus = "base" | "extension";

/** Format facts for the identifier values this registry issues. */
export interface RegistryFormat {
  /** Regular expression a well-formed identifier value matches */
  pattern?: string;
  /** Named JSON Schema string format, used instead of a pattern (e.g. "uuid") */
  format?: string;
  /** A representative, well-formed identifier value */
  example?: string;
  /**
   * Human-readable presentation/validation notes that JSON Schema cannot
   * express (e.g. "Strip hyphens before storing", "Cast to uppercase").
   */
  normalization?: string[];
}

/**
 * Registry entry as stored in src/content/registries/index.json (source of
 * truth), keyed by its canonical CommonGrants code, e.g. "org:us:ein".
 */
export interface RegistrySourceEntry {
  /** Human-readable registry name (e.g. "Employer Identification Number") */
  name: string;
  /** Short description of what the identifier is and who uses it */
  description: string;
  /** Classification of the issuing registry */
  kind: RegistryKind;
  /** Base identifier on a model, or a catalog-only extension */
  status: RegistryStatus;
  /** CommonGrants models this registry applies to (e.g. ["Organization"]) */
  models: string[];
  /** Authority that issues and maintains the identifier */
  issuer?: string;
  /** Equivalent org-id.guide code, when one exists (e.g. "US-EIN") */
  orgIdGuide?: string;
  /** Link to the upstream source or org-id.guide entry */
  source?: string;
  /** Lookup URL template with an `{id}` placeholder */
  lookupUriTemplate?: string;
  /** Format facts for the identifier values */
  format?: RegistryFormat;
}

/**
 * A fully resolved registry: source metadata plus the fields derived from its
 * `<object>:<scope>:<prop>` code.
 */
export interface Registry extends RegistrySourceEntry {
  /** Canonical registry code and identifier map key, e.g. "org:us:ein" */
  code: string;
  /** URL-safe slug, e.g. "org-us-ein" */
  slug: string;
  /** First code segment: the model the identifier applies to (org, opp, awd) */
  object: string;
  /** Second code segment: jurisdiction or namespace (us, xi, grants.gov) */
  scope: string;
  /** Third code segment: the identifier property (ein, uei, fain) */
  prop: string;
  /** Full CommonGrants schema the object prefix maps to (Organization, Opportunity, Award) */
  schema: string;
  /** Filter/dropdown label combining schema and prefix, e.g. "Organization (org)" */
  schemaLabel: string;
}

/** Map of registry code to resolved registry. */
export type RegistryMap = Record<string, Registry>;

/** Filter dropdown options returned by getFilterOptions(). */
export interface RegistryFilterOptions {
  schemas: string[];
  scopes: string[];
  kinds: string[];
  statuses: string[];
}
