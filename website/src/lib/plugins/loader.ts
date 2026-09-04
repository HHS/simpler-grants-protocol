import { readFileSync } from "fs";
import pluginsIndex from "@/content/plugins/index.json";
import { loadAllCustomFields } from "@/lib/custom-fields";
import { Paths } from "@/lib/schema/paths";
import { filterDocsHref, isCustomFilterType } from "./filter-docs";
import type {
  Plugin,
  PluginCacheEntry,
  PluginFilterDeclarations,
  ResolvedPluginField,
  ResolvedPluginFilter,
} from "./types";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded plugins */
let pluginsCache: Plugin[] | null = null;

/** Flattens resource -> method -> name declarations into a renderable list. */
function resolveCustomFilters(
  pluginId: string,
  declarations: PluginFilterDeclarations = {},
): ResolvedPluginFilter[] {
  const resolved: ResolvedPluginFilter[] = [];

  for (const [resource, methods] of Object.entries(declarations)) {
    for (const [method, filters] of Object.entries(methods)) {
      for (const [name, spec] of Object.entries(filters)) {
        if (!isCustomFilterType(spec.filterType)) {
          console.error(
            `Plugin "${pluginId}" declares filter "${name}" with unknown ` +
              `filterType "${spec.filterType}". Type must be one of the ` +
              `CustomFilterType values in src/lib/plugins/types.ts.`,
          );
          continue;
        }
        resolved.push({
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

  return resolved;
}

// =============================================================================
// CORE LOADERS
// =============================================================================

/**
 * Loads all plugins from the generated metadata cache (with caching).
 * Resolves each plugin's field IDs against the custom-fields catalog and
 * flattens its filter declarations.
 *
 * Requires `pnpm generate:plugin-metadata` to have been run first.
 */
export function loadAllPlugins(): Plugin[] {
  if (pluginsCache) {
    return pluginsCache;
  }

  const cacheContent = readFileSync(Paths.PLUGIN_METADATA, "utf-8");
  const cacheIndex = JSON.parse(cacheContent) as Record<
    string,
    PluginCacheEntry
  >;

  const customFields = loadAllCustomFields();

  pluginsCache = Object.entries(cacheIndex).map(([id, entry]) => {
    const allFieldIds = Object.values(entry.fields).flat();
    const resolvedFields = allFieldIds.reduce<ResolvedPluginField[]>(
      (acc, fieldId) => {
        const field = customFields[fieldId];
        if (!field) {
          console.error(
            `Plugin "${id}" references unknown custom field "${fieldId}". ` +
              `Field must be defined in src/content/custom-fields/index.json.`,
          );
          return acc;
        }
        acc.push({
          id: fieldId,
          fieldType: field.fieldType ?? "",
          validFor: field.validFor ?? [],
        });
        return acc;
      },
      [],
    );

    return {
      id,
      ...entry,
      resolvedFields,
      resolvedFilters: resolveCustomFilters(id, entry.filters),
    };
  });

  return pluginsCache;
}

/**
 * Returns all plugin IDs for static path generation.
 * Reads directly from index.json so it works without the generated cache.
 */
export function getPluginIds(): string[] {
  return Object.keys(pluginsIndex);
}

/**
 * Returns unique filter option values across all plugins.
 */
export function getFilterOptions(): { languages: string[]; systems: string[] } {
  const plugins = loadAllPlugins();
  const languages = [...new Set(plugins.map((p) => p.language))].sort();
  const systems = [...new Set(plugins.map((p) => p.system))].sort();
  return { languages, systems };
}
