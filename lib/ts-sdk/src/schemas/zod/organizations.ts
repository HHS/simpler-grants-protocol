import { z } from "zod";
import { UuidSchema } from "./types";

// ############################################################################
// Organization reference models
//
// DRAFT (#1220-T5 validation pass). Not exported from the package barrel and
// not intended to merge as-is. The purpose of this file is to find out what a
// typed `OrgRefCollection` costs before the v0.9 SDK alignment tickets commit
// to one, and to tell #1156 what it has to carry.
// ############################################################################

/**
 * A reference to an organization.
 *
 * `identifiers` is left as a loose record: the protocol types it as `OrgIds`,
 * which seals the object to three base registry codes plus `systemId` and
 * `otherIds`. Modeling that properly needs the identifier models that #1156
 * owns, so this draft accepts any object and declares the gap as a divergence.
 *
 * `.strict()` matches the protocol's `unevaluatedProperties: {not: {}}`. It is
 * not optional decoration: without it the schema silently accepts unknown keys
 * wherever it appears nested inside another model, where the harness's own
 * root-level strictness does not reach.
 */
export const OrgRefSchema = z
  .object({
    /** The organization's unique identifier. */
    id: UuidSchema,

    /** The organization's legal name as registered with relevant authorities. */
    name: z.string(),

    /** Identifiers associated with the organization, keyed by registry code. */
    identifiers: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict();

/**
 * A group of organization references, with a primary organization and
 * optional others keyed by an implementation-defined role.
 */
export const OrgRefCollectionSchema = z
  .object({
    /** The primary organization in the collection. */
    primary: OrgRefSchema,

    /** Other organizations in the collection, keyed by role. */
    otherOrgs: z.record(z.string(), OrgRefSchema).nullish(),
  })
  .strict();
