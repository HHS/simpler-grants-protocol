/**
 * DRAFT, NOT FOR MERGE. Written for the #1221-T4 validation pass.
 *
 * These schemas exist to answer one question before `OpportunityDetails.awards`
 * ships in Core v0.5: can the award reference stack be modelled faithfully in
 * Zod today, and what diverges if it is? They are deliberately scoped to what
 * `OpportunityDetails.awards` needs (`AwdRef` and the identifier collection it
 * carries), not to the whole award surface, which #1156 owns.
 *
 * Nothing here is exported from `./index`, so the published SDK is unaffected.
 */

import { z } from "zod";

import { UuidSchema } from "./types";
import { OpportunityBaseSchema } from "./models";

// ############################################################################
// Identifier primitives
// ############################################################################

/**
 * Registry-level facts shared by every record in a registry.
 *
 * `.strict()` mirrors `unevaluatedProperties: {not: {}}` on the emitted
 * `registry` object. Per the #1220-T5 finding, strictness on a nested object
 * cannot be observed from a root-level boundary case, so the parity spec
 * probes this one through a nested case.
 *
 * Every member is optional, and `registry` itself is optional on each
 * identifier below, because `IdentifierT` declares `registry?` with `code?`
 * (`lib/core/lib/core/fields/identifier.tsp:28-34`). Requiring either, which
 * is the intuitive way to hand-write this, makes the SDK reject records the
 * protocol accepts. #1221-T4 found that by fuzzing.
 */
const RegistrySchema = z
  .object({
    /** Canonical CommonGrants registry code, `<schema>:<scope>:<prop>`. */
    code: z.string().nullish(),

    /** Link to the catalog entry for this registry. */
    url: z.url().nullish(),
  })
  .strict();

/** A registry code pinned to a single constant, as `IdentifierT` emits it. */
const registryWithCode = (code: string) =>
  z
    .object({
      code: z.literal(code).nullish(),
      url: z.url().nullish(),
    })
    .strict();

/** One archived-or-active value for a record in a registry. */
const identifierValue = <T extends z.ZodType>(id: T) =>
  z
    .object({
      id,
      status: z.enum(["active", "archived"]),
    })
    .strict();

/**
 * An identifier issued to a record by a registry. Accepts any string value and
 * any registry code; this is the generic form used under `otherIds`.
 */
export const IdentifierSchema = z
  .object({
    registry: RegistrySchema.nullish(),
    id: z.string().nullish(),
    allIds: z.array(identifierValue(z.string())).nullish(),
  })
  .strict();

/**
 * The hosting system's own identifier for a record. Same shape as
 * `Identifier`, except the value is the record's uuid in that system.
 */
export const SystemIdSchema = z
  .object({
    registry: RegistrySchema.nullish(),
    id: UuidSchema.nullish(),
    allIds: z.array(identifierValue(UuidSchema)).nullish(),
  })
  .strict();

// ############################################################################
// Award identifiers
// ############################################################################

/** The award's Federal Award Identification Number (FAIN). */
export const AwdIdFainSchema = z
  .object({
    registry: registryWithCode("awd:us:fain").nullish(),
    id: z.string().nullish(),
    allIds: z.array(identifierValue(z.string())).nullish(),
  })
  .strict();

/**
 * A collection of identifiers associated with an award.
 *
 * The protocol composes this from `IdentifierCollection` through `allOf` and
 * then seals the result with `unevaluatedProperties: {not: {}}`, so the sealed
 * key set is the union of both schemas' properties. Zod has no `allOf`, so the
 * draft flattens the inherited `systemId` and `otherIds` in and applies
 * `.strict()` once over the union, which is the same accepted key set.
 */
export const AwdIdsSchema = z
  .object({
    /** The hosting system's own identifier for this record. */
    systemId: SystemIdSchema.nullish(),

    /** The award's Federal Award Identification Number (FAIN). */
    "awd:us:fain": AwdIdFainSchema.nullish(),

    /** Additional identifiers keyed by their registry code. */
    otherIds: z.record(z.string(), IdentifierSchema).nullish(),
  })
  .strict();

// ############################################################################
// Award reference
// ############################################################################

/**
 * A reference to an award, previewing the key fields a consumer needs to
 * identify it and look it up or join it to another response.
 *
 * `id` carries `@visibility(Lifecycle.Read)` in the TypeSpec. The JSON Schema
 * emitter drops that entirely (the OpenAPI 3 emitter keeps it as `readOnly`),
 * so a schema-generated SDK cannot tell the read and write shapes apart. The
 * draft models the read shape, which is the only one the bundle describes.
 */
export const AwdRefSchema = z
  .object({
    /** Globally unique id for the award. */
    id: UuidSchema,

    /** Title or name of the award. */
    title: z.string(),

    /** System and registry-specific identifiers for the award. */
    identifiers: AwdIdsSchema.nullish(),
  })
  .strict();

// ############################################################################
// Opportunity details
// ############################################################################

/**
 * A funding opportunity with additional details.
 *
 * `competitions` is left as a loose object array on purpose: no SDK issue owns
 * Competition models, and typing it is not needed to answer this pass's
 * question. That is itself a finding: `awards` types cleanly while
 * `competitions` stays loose, so `competitions` does not block it.
 *
 * This schema does not seal itself. It extends `OpportunityBaseSchema`, which
 * is not `.strict()`, so on its own it strips unknown keys rather than
 * rejecting them the way the protocol's `unevaluatedProperties: {not: {}}`
 * does. The parity harness applies `.strict()` at the root of whatever it is
 * given, which is the only reason the root-level boundary cases agree.
 */
export const OpportunityDetailsSchema = OpportunityBaseSchema.extend({
  /** The competitions associated with the opportunity. */
  competitions: z.array(z.record(z.string(), z.unknown())).nullish(),

  /** Awards that resulted from this opportunity, as references. */
  awards: z.array(AwdRefSchema).nullish(),
});
