/**
 * Resource registry: the single map from resource name to its class and
 * either an extensible-schema binding or a fixed base schema. Adding a
 * resource = one entry here plus its typed slots (grep `resource-slot`).
 */

import { Opportunities } from "./opportunities";
import { Awards } from "./awards";
import type { ExtensibleSchemaName, ResourceName } from "../../extensions/types";
import { AwardBaseSchema } from "../../schemas";

type ResourceRegistryEntry =
  | { resourceClass: typeof Opportunities; schemaName: ExtensibleSchemaName }
  | { resourceClass: typeof Awards; baseSchema: typeof AwardBaseSchema };

// resource-slot: add an entry per API resource
export const RESOURCE_REGISTRY = {
  opportunities: { resourceClass: Opportunities, schemaName: "Opportunity" },
  awards: { resourceClass: Awards, baseSchema: AwardBaseSchema },
} as const satisfies Record<ResourceName, ResourceRegistryEntry>;

/** Compile-time seam guard: `ResourceName` and this registry's keys must not drift. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const _registryMatchesResourceNames: Equal<ResourceName, keyof typeof RESOURCE_REGISTRY> = true;
void _registryMatchesResourceNames;
