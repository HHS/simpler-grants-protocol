/**
 * Zod schemas for the CommonGrants record-reference models and the
 * registry-specialized organization identifiers they embed in the
 * @common-grants/core library.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { createIdentifierSchema, IdentifierCollectionSchema } from "./identifiers";
import { DunsSchema, EmployerTaxIdSchema, SamUeiSchema, UuidSchema } from "./types";

// ############################################################################
// AppRef schema
// ############################################################################

/**
 * A reference to an application, previewing the key fields a consumer needs to
 * identify it and look it up or join it to another response.
 */
export const AppRefSchema = z
  .object({
    /** The unique identifier for the application */
    id: UuidSchema,

    /** The title of the application */
    title: z.string(),
  })
  .strict();

// ############################################################################
// Organization identifier schemas
// ############################################################################

/** An organization's Employer Identification Number (EIN), assigned by the IRS. */
export const OrgIdEinSchema = createIdentifierSchema(EmployerTaxIdSchema, z.literal("org:us:ein"));

/** An organization's Unique Entity Identifier (UEI) from SAM.gov. */
export const OrgIdUeiSchema = createIdentifierSchema(SamUeiSchema, z.literal("org:us:uei"));

/** An organization's Data Universal Numbering System (DUNS) number. */
export const OrgIdDunsSchema = createIdentifierSchema(DunsSchema, z.literal("org:xi:duns"));

/** Identifiers associated with an organization, keyed by registry code. */
export const OrgIdsSchema = IdentifierCollectionSchema.extend({
  "org:us:ein": OrgIdEinSchema.optional(),
  "org:us:uei": OrgIdUeiSchema.optional(),
  "org:xi:duns": OrgIdDunsSchema.optional(),
}).strict();

// ############################################################################
// Organization reference schemas
// ############################################################################

/** A compact reference to an organization. */
export const OrgRefSchema = z
  .object({
    /** The organization's unique identifier. */
    id: UuidSchema,

    /** The organization's legal name as registered with relevant authorities. */
    name: z.string(),

    /** Identifiers associated with the organization, keyed by registry code. */
    identifiers: OrgIdsSchema.optional(),
  })
  .strict();

/** A group of organization references with one required primary organization. */
export const OrgRefCollectionSchema = z
  .object({
    /** The primary organization in the collection. */
    primary: OrgRefSchema,

    /** Other organizations keyed by an implementation-defined role. */
    otherOrgs: z.record(z.string(), OrgRefSchema).optional(),
  })
  .strict();
