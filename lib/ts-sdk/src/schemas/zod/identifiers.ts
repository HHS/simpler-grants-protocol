/**
 * Zod schemas for the CommonGrants identifier fields in the @common-grants/core
 * library (the `IdentifierT` template, its `Identifier`/`SystemId`
 * instantiations, and the `IdentifierCollection` that groups them).
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { UuidSchema } from "./types";

// ############################################################################
// Identifier status
// ############################################################################

/** The lifecycle status of an identifier value. */
export const IdentifierStatusEnum = z.enum(["active", "archived"]);

// ############################################################################
// Identifier factory
// ############################################################################

/**
 * Builds an identifier schema for CommonGrants `IdentifierT<Id, Code>`.
 *
 * `id` constrains both the primary value and every historical `allIds[].id`;
 * `code` pins `registry.code` and is validated only when the optional code is
 * present. The outer object, its `registry`, and each `allIds` entry are sealed
 * with `.strict()` to match the emitted `unevaluatedProperties: { not: {} }` at
 * every level.
 *
 * This factory is shared across the identifier, reference, and award schema
 * modules to define the generic and registry-specialized identifiers. It is
 * deliberately not re-exported through the public barrel: specialized
 * identifiers are a supported surface, a general-purpose factory is not.
 *
 * @param idSchema - Validates the primary `id` and each historical `allIds[].id`.
 * @param codeSchema - Validates `registry.code` when it is present.
 */
export function createIdentifierSchema<
  IdSchema extends z.ZodType<string>,
  CodeSchema extends z.ZodType<string>,
>(idSchema: IdSchema, codeSchema: CodeSchema) {
  return z
    .object({
      /** Registry-level facts shared by every record in this registry. */
      registry: z
        .object({
          /** Canonical CommonGrants registry code, `<schema>:<scope>:<prop>` (e.g. `org:us:ein`). */
          code: codeSchema.optional(),

          /** Link to the catalog entry for this registry. */
          url: z.url().optional(),
        })
        .strict()
        .optional(),

      /** The primary identifier string, when the registry has a single canonical value. */
      id: idSchema.optional(),

      /** Every known identifier for this record in this registry, including archived values. */
      allIds: z
        .array(
          z
            .object({
              /** The identifier string. */
              id: idSchema,

              /** Whether the identifier is currently valid or retired. */
              status: IdentifierStatusEnum,
            })
            .strict()
        )
        .optional(),
    })
    .strict();
}

// ############################################################################
// Identifier schemas
// ############################################################################

/**
 * A generic identifier issued to a record by a registry. Accepts any string
 * value and any registry code; specialized collections constrain both.
 */
export const IdentifierSchema = createIdentifierSchema(z.string(), z.string());

/**
 * The hosting system's own identifier for a record. The identifier value is the
 * record's UUID within the hosting system.
 */
export const SystemIdSchema = createIdentifierSchema(UuidSchema, z.string());

// ############################################################################
// Identifier collection
// ############################################################################

/**
 * A collection of identifiers associated with a record. Extensible: additional
 * registries appear under `otherIds`, keyed by their registry code, so the
 * outer object is left open.
 */
export const IdentifierCollectionSchema = z.object({
  /** The hosting system's own identifier for this record. */
  systemId: SystemIdSchema.optional(),

  /**
   * Additional identifiers keyed by their registry code, for registries the
   * protocol does not define as a base identifier on the model.
   */
  otherIds: z.record(z.string(), IdentifierSchema).optional(),
});
