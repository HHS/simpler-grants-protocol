/**
 * Resource registry: the single map from resource name to its class and
 * extensible-schema binding. Adding a resource = one entry here plus its
 * typed slots (grep `resource-slot` for the full set).
 */

import { Opportunities } from "./opportunities";
import type { ExtensibleSchemaName, ResourceName } from "../../extensions/types";

interface ResourceRegistryEntry {
  resourceClass: typeof Opportunities;
  schemaName: ExtensibleSchemaName;
}

// resource-slot: add an entry per API resource
export const RESOURCE_REGISTRY = {
  opportunities: { resourceClass: Opportunities, schemaName: "Opportunity" },
} as const satisfies Record<ResourceName, ResourceRegistryEntry>;

/** Compile-time seam guard: `ResourceName` and this registry's keys must not drift. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const _registryMatchesResourceNames: Equal<ResourceName, keyof typeof RESOURCE_REGISTRY> = true;
void _registryMatchesResourceNames;
