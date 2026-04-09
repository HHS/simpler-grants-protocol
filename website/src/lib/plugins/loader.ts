import pluginsIndex from "@/content/plugins/index.json";
import { loadAllCustomFields } from "@/lib/custom-fields";
import type { Plugin, PluginIndexEntry, ResolvedPluginField } from "./types";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded plugins */
let pluginsCache: Plugin[] | null = null;

// =============================================================================
// CORE LOADERS
// =============================================================================

/**
 * Loads all plugins from the index (with caching).
 * Resolves each plugin's field IDs against the custom-fields catalog.
 */
export function loadAllPlugins(): Plugin[] {
  if (pluginsCache) {
    return pluginsCache;
  }

  const customFields = loadAllCustomFields();
  const index = pluginsIndex as Record<string, PluginIndexEntry>;

  pluginsCache = Object.entries(index).map(([id, entry]) => {
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

    return { id, ...entry, resolvedFields };
  });

  return pluginsCache;
}

/**
 * Returns all plugin IDs for static path generation.
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
