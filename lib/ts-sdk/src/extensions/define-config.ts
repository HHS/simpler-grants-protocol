/**
 * Provides the `defineConfig()` utility function.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import { OpportunityBaseSchema } from "../schemas/zod/models";
import type { ExtensibleSchemaName, SchemaExtensions, PluginConfig } from "./types";
import { withCustomFields } from "./with-custom-fields";

// ############################################################################
// Runtime schema map
// ############################################################################

/**
 * Maps each `ExtensibleSchemaName` to its base Zod schema constant.
 *
 * This is the runtime counterpart to the `BaseSchemaMap` type in `types.ts`.
 * Both must stay in sync when new extensible models are added.
 */
const BASE_SCHEMAS: Record<ExtensibleSchemaName, z.AnyZodObject> = {
  Opportunity: OpportunityBaseSchema,
};

// ############################################################################
// defineConfig
// ############################################################################

/**
 * Creates a `PluginConfig` from the given schema extensions.
 *
 * Iterates over extensible schemas. For those with specs in `extensions`,
 * applies `withCustomFields()` to produce a typed schema. Others pass
 * through unchanged.
 *
 * @param extensions - Custom field specifications for extensible models
 * @returns A `PluginConfig` with `.extensions` and `.schemas`
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   Opportunity: {
 *     legacyId: { fieldType: "string" },
 *     category: { fieldType: "string", description: "Grant category" },
 *   },
 * } as const);
 *
 * // config.schemas.Opportunity has typed customFields
 * ```
 */
export function defineConfig<const T extends SchemaExtensions>(extensions: T): PluginConfig<T> {
  const schemas: Record<string, z.ZodTypeAny> = {};

  for (const [name, baseSchema] of Object.entries(BASE_SCHEMAS)) {
    const specs = extensions[name as ExtensibleSchemaName];
    if (specs && Object.keys(specs).length > 0) {
      schemas[name] = withCustomFields(baseSchema, specs);
    } else {
      schemas[name] = baseSchema;
    }
  }

  return { extensions, schemas } as PluginConfig<T>;
}
