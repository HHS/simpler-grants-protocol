/**
 * Assembles a plugin-typed client: a transport `Client` whose resource slots
 * are bound to the plugin's compiled schemas and registered filter routes.
 * Consumed by `plugin.getClient()`.
 */

import { z } from "zod";
import { Client } from "../client";
import { Opportunities } from "./opportunities";
import { RESOURCE_REGISTRY } from "./registry";
import type { PluginRoutes, ResourceName } from "../../extensions/types";
import type { Plugin, PluginSchemasInput } from "../../extensions/define-plugin";
import type { ClientConfig } from "../config";
import type { AuthMethod } from "../auth";
import type { OpportunityBase } from "../../types";

/** Item type projected from the plugin's compiled schema for a model. */
type ResolvedItemType<T extends PluginSchemasInput> = z.infer<
  Plugin<T>["schemas"]["Opportunity"]["commonSchema"]
> &
  OpportunityBase;

/**
 * A `Client` whose resource slots carry the plugin's item and filter types:
 * `search({ filters })` autocompletes the registered filter names and
 * responses parse with the plugin's schema by default.
 *
 * The default resource slots are `Omit`ted (not intersected) — an intersection
 * would let `Client`'s looser default `opportunities` signature win call
 * resolution and erase the plugin's filter typing.
 */
export type BuiltClient<T extends PluginSchemasInput, TRoutes extends PluginRoutes> = Omit<
  Client,
  ResourceName
> & {
  // resource-slot: typed projection per resource
  opportunities: Opportunities<TRoutes, ResolvedItemType<T>>;
};

/**
 * Builds a client from a plugin: constructs the transport `Client`, then
 * overlays each resource slot with a plugin-bound instance (the plugin's
 * compiled schema as the default parse schema, its routes for filter
 * classification).
 */
export function buildClientForPlugin<T extends PluginSchemasInput, TRoutes extends PluginRoutes>(
  plugin: Plugin<T, TRoutes>,
  config: ClientConfig & { auth?: AuthMethod } = {}
): BuiltClient<T, TRoutes> {
  const client = new Client(config);

  // resource-slot: build each slot from the registry, so adding a resource
  // (organizations, applications, awards) is a registry entry + a typed slot.
  // definePlugin populates a compiled schema for every extensible model, so the
  // registry's schema binding always resolves here.
  const { resourceClass, schemaName } = RESOURCE_REGISTRY.opportunities;
  const oppSchema = plugin.schemas[schemaName].commonSchema as z.ZodType<OpportunityBase, unknown>;
  (client as unknown as { opportunities: Opportunities }).opportunities = new resourceClass(
    client,
    oppSchema,
    plugin.routes
  );

  // Second of the two cast points (the slot assignment above is the other):
  // BuiltClient projects the plugin's item + filter types.
  return client as unknown as BuiltClient<T, TRoutes>;
}
