/**
 * JSON-safe introspection for compiled CommonGrants plugins.
 *
 * @module @common-grants/sdk/extensions
 */

import type { Plugin, PluginSchemasInput } from "./define-plugin";
import type { PluginCapability, PluginRoutes } from "./types";

/** Version of the serializable plugin descriptor contract. */
export const PLUGIN_DESCRIPTOR_VERSION = 1 as const;

export interface PluginDescriptorV1 {
  descriptorVersion: typeof PLUGIN_DESCRIPTOR_VERSION;
  plugin: {
    name: string | null;
    version: string | null;
    sourceSystem: string | null;
  };
  capabilities: {
    declared: PluginCapability[];
    observed: PluginCapability[];
    status: "match" | "mismatch" | "undeclared";
    declaredButNotObserved: PluginCapability[];
    observedButNotDeclared: PluginCapability[];
  };
  schemas: PluginSchemaDescriptor[];
  routes: PluginRouteDescriptor[];
}

export interface PluginSchemaDescriptor {
  name: string;
  customFields: Array<{
    key: string;
    name: string | null;
    fieldType: string;
    description: string | null;
  }>;
  sourceSchema: boolean;
  transforms: {
    mode: "declarative" | "callable" | "none";
    toCommon: boolean;
    fromCommon: boolean;
  };
}

export interface PluginRouteDescriptor {
  resource: string;
  method: string;
  filters: Array<{
    name: string;
    filterType: string;
    description: string | null;
  }>;
}

const CAPABILITY_ORDER: PluginCapability[] = ["customFields", "customFilters", "transforms"];

/**
 * Returns a stable, JSON-safe description of a compiled CommonGrants plugin.
 *
 * The descriptor reports structural facts retained by `definePlugin()`. It does
 * not serialize schemas or functions, execute transforms, or infer semantic
 * behavior such as mapping correctness or information loss.
 */
export function describePlugin<T extends PluginSchemasInput, TRoutes extends PluginRoutes>(
  plugin: Plugin<T, TRoutes>
): PluginDescriptorV1 {
  const schemas = Object.entries(plugin.schemas)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, rawSchema]) => {
      const schema = rawSchema as {
        sourceSchema?: unknown;
        customFields?: Record<
          string,
          { name?: unknown; fieldType?: unknown; description?: unknown }
        >;
        mappings?: unknown;
        toCommon?: unknown;
        fromCommon?: unknown;
      };
      const hasToCommon = typeof schema.toCommon === "function";
      const hasFromCommon = typeof schema.fromCommon === "function";

      return {
        name,
        customFields: Object.entries(schema.customFields ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, spec]) => ({
            key,
            name: typeof spec.name === "string" ? spec.name : null,
            fieldType: typeof spec.fieldType === "string" ? spec.fieldType : "unknown",
            description: typeof spec.description === "string" ? spec.description : null,
          })),
        sourceSchema: schema.sourceSchema !== undefined,
        transforms: {
          mode:
            schema.mappings !== undefined
              ? ("declarative" as const)
              : hasToCommon || hasFromCommon
                ? ("callable" as const)
                : ("none" as const),
          toCommon: hasToCommon,
          fromCommon: hasFromCommon,
        },
      };
    });

  const routes = describeRoutes(plugin.routes);
  const declared = CAPABILITY_ORDER.filter(capability =>
    plugin.meta?.capabilities?.includes(capability)
  );
  const observed = CAPABILITY_ORDER.filter(capability => {
    if (capability === "customFields") {
      return schemas.some(schema => schema.customFields.length > 0);
    }
    if (capability === "customFilters") {
      return routes.some(route => route.filters.length > 0);
    }
    return schemas.some(schema => schema.transforms.toCommon || schema.transforms.fromCommon);
  });
  const declaredButNotObserved = declared.filter(capability => !observed.includes(capability));
  const observedButNotDeclared = observed.filter(capability => !declared.includes(capability));

  return {
    descriptorVersion: PLUGIN_DESCRIPTOR_VERSION,
    plugin: {
      name: plugin.meta?.name ?? null,
      version: plugin.meta?.version ?? null,
      sourceSystem: plugin.meta?.sourceSystem ?? null,
    },
    capabilities: {
      declared,
      observed,
      status:
        declared.length === 0
          ? "undeclared"
          : declaredButNotObserved.length === 0 && observedButNotDeclared.length === 0
            ? "match"
            : "mismatch",
      declaredButNotObserved,
      observedButNotDeclared,
    },
    schemas,
    routes,
  };
}

function describeRoutes(routes: PluginRoutes | undefined): PluginRouteDescriptor[] {
  if (!routes) return [];

  const result: PluginRouteDescriptor[] = [];
  for (const [resource, methods] of Object.entries(routes).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    for (const [method, declarations] of Object.entries(methods ?? {}).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      const filters = Object.entries(declarations?.filters ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, spec]) => ({
          name,
          filterType: spec.filterType,
          description: spec.description ?? null,
        }));
      result.push({ resource, method, filters });
    }
  }
  return result;
}
