import pluginsIndex from "@/content/plugins/index.json";
import type { Plugin, PluginFieldEntry, PluginFieldMap } from "./types";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded plugins */
let pluginsCache: Plugin[] | null = null;

const fieldsMap = pluginsIndex.fields as PluginFieldMap;

// =============================================================================
// CORE LOADERS
// =============================================================================

/**
 * Loads all plugins from the index (with caching).
 * Resolves each plugin's field IDs against the shared fields map.
 */
export function loadAllPlugins(): Plugin[] {
  if (pluginsCache) {
    return pluginsCache;
  }

  pluginsCache = Object.entries(pluginsIndex.plugins).map(([id, entry]) => ({
    id,
    ...entry,
    resolvedFields: entry.fields.map((fieldName) => ({
      name: fieldName,
      ...(fieldsMap[fieldName] as PluginFieldEntry),
    })),
  }));

  return pluginsCache;
}
