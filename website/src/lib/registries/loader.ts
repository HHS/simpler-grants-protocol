import registriesIndex from "@/content/registries/index.json";
import type {
  Registry,
  RegistryMap,
  RegistrySourceEntry,
  RegistryFilterOptions,
} from "./types";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded registries */
let registriesCache: RegistryMap | null = null;

/** Maps the object prefix of a registry code to its full CommonGrants schema. */
const SCHEMA_BY_OBJECT: Record<string, string> = {
  org: "Organization",
  opp: "Opportunity",
  awd: "Award",
};

/** Reads the raw index, typed by its source-entry shape. */
function rawIndex(): Record<string, RegistrySourceEntry> {
  return registriesIndex as Record<string, RegistrySourceEntry>;
}

/** Splits a code into its object/scope/prop segments and derives the slug. */
function resolveRegistry(code: string, entry: RegistrySourceEntry): Registry {
  const [object = "", scope = "", prop = ""] = code.split(":");
  const schema = SCHEMA_BY_OBJECT[object] ?? object;
  return {
    ...entry,
    code,
    slug: registryCodeToSlug(code),
    object,
    scope,
    prop,
    schema,
    schemaLabel: `${schema} (${object})`,
  };
}

// =============================================================================
// CORE LOADERS
// Used by: index.astro, [slug].astro
// =============================================================================

/**
 * Converts a registry code to a URL-safe slug: lowercase, with ":" and "."
 * replaced by "-" (e.g. "org:us:ein" -> "org-us-ein", "org:grants.gov:system"
 * -> "org-grants-gov-system").
 */
export function registryCodeToSlug(code: string): string {
  return code.toLowerCase().replace(/[:.]/g, "-");
}

/**
 * Loads all registries from the index (with caching).
 * @returns Map of registry code to resolved registry data
 */
export function loadAllRegistries(): RegistryMap {
  if (registriesCache) {
    return registriesCache;
  }

  const registries: RegistryMap = {};
  for (const [code, entry] of Object.entries(rawIndex())) {
    registries[code] = resolveRegistry(code, entry);
  }

  registriesCache = registries;
  return registries;
}

// =============================================================================
// STATIC PATH GENERATION
// Used by: [slug].astro (getStaticPaths)
// =============================================================================

/**
 * Gets the code/slug pair for every registry, for static path generation.
 * @returns Array of `{ code, slug }` objects
 */
export function getRegistrySlugs(): { code: string; slug: string }[] {
  return Object.keys(rawIndex()).map((code) => ({
    code,
    slug: registryCodeToSlug(code),
  }));
}

// =============================================================================
// FILTER DROPDOWN OPTIONS
// Used by: index.astro
// =============================================================================

/**
 * Gets all unique filter options for dropdowns.
 * @returns Sorted arrays of unique objects, scopes, kinds, and statuses
 */
export function getFilterOptions(): RegistryFilterOptions {
  const registries = Object.values(loadAllRegistries());
  const unique = (values: string[]): string[] =>
    Array.from(new Set(values.filter(Boolean))).sort();

  return {
    schemas: unique(registries.map((r) => r.schemaLabel)),
    scopes: unique(registries.map((r) => r.scope)),
    kinds: unique(registries.map((r) => r.kind)),
    statuses: unique(registries.map((r) => r.status)),
  };
}
