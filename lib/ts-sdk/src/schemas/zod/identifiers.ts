/**
 * DRAFT Zod schemas for the CommonGrants identifier models.
 *
 * Written for the #1219-T5 validation pass, not for release. The point is to
 * find out what the protocol's identifier shapes cost to express in Zod before
 * the v0.9 SDK-alignment tickets commit to them, so everything lives in one
 * throwaway module rather than being split across `fields.ts` and `models.ts`
 * the way the shipped schemas are.
 *
 * Covers `IdentifierT` and its instantiations (`Identifier`, `SystemId`,
 * `OppIdFon`, `OppIdAln`), `IdentifierCollection`, `OppIds`, and the `OppRef`
 * that carries `identifiers` as of protocol v0.5.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { UuidSchema } from "./types";

// ############################################################################
// Identifier primitives
// ############################################################################

/** The lifecycle status of an identifier value. */
export const IdentifierStatusEnum = z.enum(["active", "archived"]);

/**
 * Builds the Zod equivalent of `Fields.IdentifierT`, taking its type arguments
 * in the opposite order to the TypeSpec template (`<Id, Code>` there) so the
 * pinned registry code reads first at each call site.
 *
 * `code` pins `registry.code` to a registry (a `z.literal` for the typed
 * instantiations, `z.string()` for the generic form) and `id` constrains the
 * identifier value. Both the outer object and the nested `registry` are
 * `.strict()`, matching the `unevaluatedProperties: { not: {} }` the JSON
 * Schema emitter puts on every `IdentifierT` instantiation.
 *
 * Every field is optional in the protocol, since `IdentifierT` declares no
 * required properties, so `{}` is a valid identifier and the factory mirrors that.
 */
function identifierT<Code extends z.ZodType<string>, Id extends z.ZodType<string>>(
  code: Code,
  id: Id
) {
  return z
    .object({
      /** Registry-level facts shared by every record in this registry */
      registry: z
        .object({
          /** Canonical CommonGrants registry code, `<schema>:<scope>:<prop>` */
          code: code.nullish(),

          /** Link to the catalog entry for this registry */
          url: z.url().nullish(),
        })
        .strict()
        .nullish(),

      /** The primary identifier string, when the registry has a single canonical value */
      id: id.nullish(),

      /** Every known identifier for this record in this registry, including archived values */
      allIds: z
        .array(
          z
            .object({
              /** The identifier string */
              id: id,

              /** Whether the identifier is currently valid or retired */
              status: IdentifierStatusEnum,
            })
            .strict()
        )
        .nullish(),
    })
    .strict();
}

/** An identifier issued to a record by a registry, accepting any registry code */
export const IdentifierSchema = identifierT(z.string(), z.string());

/** The hosting system's own identifier for a record, whose value is a UUID */
export const SystemIdSchema = identifierT(z.string(), UuidSchema);

/** A collection of identifiers associated with a record */
export const IdentifierCollectionSchema = z.object({
  /** The hosting system's own identifier for this record */
  systemId: SystemIdSchema.nullish(),

  /** Additional identifiers keyed by their registry code */
  otherIds: z.record(z.string(), IdentifierSchema).nullish(),
});

// ############################################################################
// Opportunity identifiers
// ############################################################################

/** An opportunity's Federal Opportunity Number (FON), assigned by the awarding agency */
export const OppIdFonSchema = identifierT(z.literal("opp:us:fon"), z.string());

/** An opportunity's Assistance Listing Number (ALN), formerly the CFDA number */
export const OppIdAlnSchema = identifierT(z.literal("opp:us:aln"), z.string());

/**
 * A collection of identifiers associated with an opportunity.
 *
 * The protocol expresses this as `allOf: [IdentifierCollection]` plus its own
 * `properties` and a sealing `unevaluatedProperties`. Zod has no `allOf`, so
 * the inherited properties are flattened in with `.extend()` and the result is
 * sealed with `.strict()`, which is equivalent here because `unevaluatedProperties`
 * sees `systemId` and `otherIds` through the `allOf` and allows them.
 */
export const OppIdsSchema = IdentifierCollectionSchema.extend({
  /** The opportunity's Federal Opportunity Number (FON) */
  "opp:us:fon": OppIdFonSchema.nullish(),

  /** The opportunity's Assistance Listing Number (ALN) */
  "opp:us:aln": OppIdAlnSchema.nullish(),
}).strict();

/** A reference to an opportunity, previewing the fields needed to identify it */
export const OppRefSchema = z
  .object({
    /** Globally unique id for the opportunity */
    id: UuidSchema,

    /** Title or name of the funding opportunity */
    title: z.string(),

    /** System and registry-specific identifiers for the opportunity */
    identifiers: OppIdsSchema.nullish(),
  })
  .strict();
