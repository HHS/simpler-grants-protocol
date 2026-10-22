import implementationsIndex from "@/content/implementations/index.json";
import pluginsIndex from "@/content/plugins/index.json";
import { loadAllCustomFields } from "@/lib/custom-fields";
import { filterDocsHref, isCustomFilterType } from "@/lib/plugins/filter-docs";
import type {
  Implementation,
  ImplementationSourceEntry,
  ImplementationFilterOptions,
  ResolvedImplementationPlugin,
} from "./types";
import type { CustomField } from "@/lib/custom-fields";
import type { ResolvedPluginFilter } from "@/lib/plugins";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded implementations */
let implementationsCache: Implementation[] | null = null;

/** Maps the first path segment after /common-grants/ to its OpenAPI tag. */
const TAG_BY_RESOURCE: Record<string, string> = {
  opportunities: "Opportunities",
  awards: "Awards",
  orgs: "Organizations",
  applications: "Applications",
  competitions: "Competitions",
  forms: "Forms",
};

/** Derives the data-type tags from a list of "METHOD /path" routes. */
function tagsFromRoutes(routes: string[]): string[] {
  const tags = new Set<string>();
  for (const route of routes) {
    const resource = route.split(" ")[1]?.split("/")[2] ?? "";
    tags.add(TAG_BY_RESOURCE[resource] ?? resource);
  }
  return Array.from(tags).filter(Boolean);
}

/** Resolves plugin IDs to catalog labels, flagging unknown IDs. */
function resolvePlugins(
  id: string,
  pluginIds: string[] = [],
): ResolvedImplementationPlugin[] {
  const plugins = pluginsIndex as Record<string, { label: string }>;
  return pluginIds.flatMap((pluginId) => {
    const plugin = plugins[pluginId];
    if (!plugin) {
      console.error(
        `Implementation "${id}" references unknown plugin "${pluginId}". ` +
          `Plugin must be defined in src/content/plugins/index.json.`,
      );
      return [];
    }
    return [{ id: pluginId, label: plugin.label }];
  });
}

/** A filter as declared under a plugin's resource -> method -> name map. */
interface PluginFilterSpec {
  filterType: string;
  description?: string;
}

/**
 * Resolves filter names against the filters the implementation's plugins
 * declare, in the same shape the plugin pages render, so the detail page can
 * reuse the plugin catalog's filter cards. Names no plugin declares come back
 * separately, since there is no filter type to build a card from.
 */
function resolveFilters(
  filterNames: string[] = [],
  pluginIds: string[] = [],
): { resolved: ResolvedPluginFilter[]; unresolved: string[] } {
  const plugins = pluginsIndex as Record<
    string,
    {
      filters?: Record<
        string,
        Record<string, Record<string, PluginFilterSpec>>
      >;
    }
  >;
  const declared = new Map<string, ResolvedPluginFilter>();
  for (const pluginId of pluginIds) {
    const resources = plugins[pluginId]?.filters ?? {};
    for (const [resource, methods] of Object.entries(resources)) {
      for (const [method, filters] of Object.entries(methods)) {
        for (const [name, spec] of Object.entries(filters)) {
          if (declared.has(name) || !isCustomFilterType(spec.filterType)) {
            continue;
          }
          declared.set(name, {
            name,
            filterType: spec.filterType,
            description: spec.description ?? "",
            resource,
            method,
            docsHref: filterDocsHref(spec.filterType),
          });
        }
      }
    }
  }

  const resolved: ResolvedPluginFilter[] = [];
  const unresolved: string[] = [];
  for (const name of filterNames) {
    const filter = declared.get(name);
    if (filter) resolved.push(filter);
    else unresolved.push(name);
  }
  return { resolved, unresolved };
}

// =============================================================================
// CORE LOADERS
// Used by: index.astro, [slug].astro
// =============================================================================

/**
 * Loads all implementations from the index (with caching), sorted by name.
 * Checks custom field and plugin IDs against their catalogs.
 * @returns Array of resolved implementations
 */
export function loadAllImplementations(): Implementation[] {
  if (implementationsCache) {
    return implementationsCache;
  }

  const raw = implementationsIndex as Record<string, ImplementationSourceEntry>;
  const customFields = loadAllCustomFields();

  implementationsCache = Object.entries(raw)
    .map(([id, entry]) => {
      const resolvedFields: CustomField[] = [];
      for (const fieldId of entry.customFields ?? []) {
        const field = customFields[fieldId];
        if (!field) {
          console.error(
            `Implementation "${id}" references unknown custom field "${fieldId}". ` +
              `Move it to sourceSpecificFields or add it to src/content/custom-fields/index.json.`,
          );
          continue;
        }
        resolvedFields.push(field);
      }
      const filters = resolveFilters(entry.customFilters, entry.plugins);
      return {
        ...entry,
        id,
        tags: tagsFromRoutes(entry.routes),
        resolvedPlugins: resolvePlugins(id, entry.plugins),
        resolvedFilters: filters.resolved,
        unresolvedFilters: filters.unresolved,
        resolvedFields,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return implementationsCache;
}

/**
 * Returns all implementation IDs for static path generation.
 */
export function getImplementationIds(): string[] {
  return Object.keys(implementationsIndex);
}

// =============================================================================
// FILTER DROPDOWN OPTIONS
// Used by: index.astro
// =============================================================================

/**
 * Gets all unique filter options for dropdowns.
 * @returns Sorted arrays of unique tags, scopes, and maintainers
 */
export function getFilterOptions(): ImplementationFilterOptions {
  const implementations = loadAllImplementations();
  const unique = (values: string[]): string[] =>
    Array.from(new Set(values.filter(Boolean))).sort();

  return {
    tags: unique(implementations.flatMap((i) => i.tags)),
    scopes: unique(implementations.flatMap((i) => i.scope)),
    maintainers: unique(implementations.map((i) => i.maintainer)),
  };
}
