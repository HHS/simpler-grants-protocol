/**
 * Hand-written organization fixtures, plus the revision records behind the
 * `/orgs/{orgId}/changes` routes. Awards build their org references from
 * `orgRef()` here, so a funder always resolves. The write routes are
 * validate-and-echo, so the change history callers can list comes entirely
 * from `ORG_REVISION_FIXTURES`; a submitted change is never appended to it.
 */

import { CANONICAL_RECORD_ID } from "./ids";
import type { CustomField } from "./fixtures";

/** Registry-level facts shared by every record in a registry. */
export interface Registry {
  code: string;
  url?: string;
}

/** One identifier value with its lifecycle status (`Fields.Identifier.allIds`). */
export interface IdentifierValue {
  id: string;
  status: "active" | "archived";
}

/** An identifier within one registry (mirrors `Fields.Identifier`). */
export interface Identifier {
  registry: Registry;
  id?: string;
  /** Every known value in this registry, including archived ones. */
  allIds?: IdentifierValue[];
}

/** Identifiers keyed by registry code (mirrors `Models.OrgIds`). */
export interface OrgIds {
  systemId?: Identifier;
  "org:us:ein"?: Identifier;
  "org:us:uei"?: Identifier;
  "org:xi:duns"?: Identifier;
  otherIds?: Record<string, Identifier>;
}

/** A physical address (mirrors `Fields.Address`). */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  stateOrProvince: string;
  country?: string;
  postalCode?: string;
}

/** Addresses with a required primary (mirrors `Fields.AddressCollection`). */
export interface AddressCollection {
  primary: Address;
  otherAddresses?: Record<string, Address>;
}

/** A phone number (mirrors `Fields.Phone`). */
export interface Phone {
  countryCode: string;
  number: string;
  extension?: string;
  isMobile?: boolean;
}

/** Phones with a required primary (mirrors `Fields.PhoneCollection`). */
export interface PhoneCollection {
  primary: Phone;
  fax?: Phone;
  otherPhones?: Record<string, Phone>;
}

/** Emails with a required primary (mirrors `Fields.EmailCollection`). */
export interface EmailCollection {
  primary: string;
  otherEmails?: Record<string, string>;
}

/** A PCS organization-type term (mirrors `Fields.PCSOrgType`). */
export interface PCSOrgType {
  term: string;
  class: "Organization types";
  code: string;
  description?: string;
}

/** Social and web links (mirrors `Models.OrgSocialLinks`). */
export interface OrgSocialLinks {
  website?: string;
  facebook?: string;
  twitterOrX?: string;
  bluesky?: string;
  instagram?: string;
  linkedin?: string;
  otherSocials?: Record<string, string>;
}

/** An organization in its fullest (`Models.OrganizationBase`) shape. */
export interface Organization {
  id: string;
  name: string;
  identifiers?: OrgIds;
  orgType?: PCSOrgType;
  ein?: string;
  uei?: string;
  duns?: string;
  addresses?: AddressCollection;
  phones?: PhoneCollection;
  emails?: EmailCollection;
  mission?: string;
  yearFounded?: string;
  socials?: OrgSocialLinks;
  customFields?: Record<string, CustomField>;
}

/** A reference to an organization (mirrors `Models.OrgRef`). */
export interface OrgRef {
  id: string;
  name: string;
  identifiers?: OrgIds;
}

/** Organization references with a required primary (`Models.OrgRefCollection`). */
export interface OrgRefCollection {
  primary: OrgRef;
  otherOrgs?: Record<string, OrgRef>;
}

/** The lifecycle status of a change (mirrors `Models.RevisionStatus`). */
export interface RevisionStatus {
  value: "pending" | "accepted" | "denied" | "superseded" | "custom";
  customValue?: string;
  description?: string;
}

/**
 * A change to an organization profile (mirrors `Models.OrgRevision`).
 * `orgId` is fixture-only, not part of the protocol model; `shapeRevision()`
 * must strip it before a revision is served.
 */
export interface OrgRevision {
  id: string;
  orgId: string;
  status: RevisionStatus;
  source?: string;
  patch?: Record<string, unknown>;
  snapshot?: Organization;
  createdAt: string;
  lastModifiedAt: string;
}

/** The `OrgRevision` shape actually sent on the wire — `orgId` removed. */
export type WireOrgRevision = Omit<OrgRevision, "orgId">;

/** The id Swagger UI pre-fills into the `orgId` box (see `./ids`). */
export const CANONICAL_ORGANIZATION_ID = CANONICAL_RECORD_ID;

/**
 * `changeId` pre-fills with the same value as `orgId`, so the canonical org
 * must have a change carrying this id or the pre-filled Execute answers 404.
 */
export const CANONICAL_ORG_REVISION_ID = CANONICAL_RECORD_ID;

/** The id published on the `Models.OrganizationBase` example itself. */
export const DOCUMENTED_ORGANIZATION_ID =
  "083b4567-e89d-42c8-a439-6c1234567890";

/**
 * Ids of the organizations that other fixture modules cite as funders or
 * recipients. Exported so those modules import one definition instead of
 * re-typing the UUID, which no reference builder could catch drifting.
 */
export const HRSA_ORG_ID = "018f2e77-4b5c-7d2e-9f3a-bcdef1234567";
export const NSF_ORG_ID = "018f2e77-5c6d-7e3f-8a4b-cdef12345678";
export const CASCADE_WORKFORCE_ORG_ID = "018f2e77-6d7e-7f4a-9b5c-def123456789";
export const LAKESIDE_ARTS_ORG_ID = "018f2e77-7e8f-7a5b-8c6d-ef1234567890";
export const PRAIRIE_BROADBAND_ORG_ID = "018f2e77-8f90-7b6c-8d7e-f12345678901";
export const COASTAL_RESEARCH_ORG_ID = "018f2e77-9012-7c7d-8e8f-123456789012";

/** Builds an EIN identifier entry. */
function ein(value: string): Identifier {
  return {
    registry: {
      code: "org:us:ein",
      url: "https://commongrants.org/registries/org-us-ein",
    },
    id: value,
  };
}

/** Builds a UEI identifier entry. */
function uei(value: string): Identifier {
  return {
    registry: {
      code: "org:us:uei",
      url: "https://commongrants.org/registries/org-us-uei",
    },
    id: value,
  };
}

/** Builds a DUNS identifier entry. */
function dunsId(value: string): Identifier {
  return {
    registry: {
      code: "org:xi:duns",
      url: "https://commongrants.org/registries/org-xi-duns",
    },
    id: value,
  };
}

/** Builds a US address in the shape `Fields.Address` requires. */
function usAddress(
  street1: string,
  city: string,
  stateOrProvince: string,
  postalCode: string,
): Address {
  return { street1, city, stateOrProvince, country: "US", postalCode };
}

/** Builds a US phone number. */
function usPhone(number: string, isMobile = false): Phone {
  return { countryCode: "+1", number, isMobile };
}

/** The fixture set: 8 organizations spanning funders and recipients. */
export const ORGANIZATION_FIXTURES: readonly Organization[] = Object.freeze<
  Organization[]
>([
  // ---- The canonical record: the spec's documented OrganizationBase example ----
  {
    // Mirrors the spec's documented OrganizationBase example field for field,
    // oddities included. Only the id differs (see `./ids`).
    id: CANONICAL_ORGANIZATION_ID,
    name: "Example Organization",
    orgType: {
      term: "Hospital",
      class: "Organization types",
      code: "EO000000",
      description:
        "Institutions with the primary purpose of providing in-patient physical and mental health services",
    },
    identifiers: {
      "org:us:ein": ein("123456789"),
      "org:us:uei": uei("AB0123456789"),
    },
    ein: "123456789",
    uei: "AB0123456789",
    addresses: {
      primary: {
        street1: "456 Main St",
        street2: "Suite 100",
        city: "Anytown",
        stateOrProvince: "CA",
        country: "US",
        postalCode: "12345",
      },
      otherAddresses: {
        // Duplicate of `primary` on purpose; the published example does this.
        satellite: {
          street1: "456 Main St",
          street2: "Suite 100",
          city: "Anytown",
          stateOrProvince: "CA",
          country: "US",
          postalCode: "12345",
        },
        international: {
          street1: "123 Rue Principale",
          city: "Montreal",
          stateOrProvince: "QC",
          country: "CA",
          postalCode: "H2Y 1C6",
        },
      },
    },
    phones: {
      primary: usPhone("444-456-1230", true),
      fax: {
        countryCode: "+1",
        number: "555-123-4567",
        extension: "123",
        isMobile: false,
      },
      otherPhones: {
        support: usPhone("333-456-1230"),
        // Same number as `primary` on purpose; the example's own value.
        marketing: usPhone("444-456-1230", true),
      },
    },
    emails: {
      primary: "info@example.com",
      otherEmails: {
        support: "support@example.com",
        marketing: "marketing@example.com",
      },
    },
    mission: "To provide support and resources to the community.",
    yearFounded: "2024",
    socials: {
      website: "https://www.example.com",
      facebook: "https://www.facebook.com/example",
      twitterOrX: "https://x.com/example",
      instagram: "https://www.instagram.com/example",
      linkedin: "https://www.linkedin.com/company/example",
      otherSocials: { youtube: "https://www.youtube.com/example" },
    },
  },

  // ---- The id published on the OrganizationBase example ----
  {
    id: DOCUMENTED_ORGANIZATION_ID,
    name: "Riverside Community Health Center",
    orgType: {
      term: "Hospital",
      class: "Organization types",
      code: "EO000000",
    },
    identifiers: {
      // `allIds` carries the full registry history, archived values included;
      // the scalar `ein` and `id` stay the current value.
      "org:us:ein": {
        ...ein("234567890"),
        allIds: [
          { id: "234567890", status: "active" },
          { id: "231456789", status: "archived" },
        ],
      },
      "org:us:uei": uei("BC1234567890"),
    },
    ein: "234567890",
    uei: "BC1234567890",
    addresses: {
      primary: usAddress("1200 Riverside Dr", "Riverside", "CA", "92501"),
    },
    phones: { primary: usPhone("951-555-0142") },
    emails: { primary: "grants@riversidechc.example.org" },
    mission:
      "To deliver comprehensive primary care to underserved residents of Riverside County.",
    yearFounded: "1978",
    socials: { website: "https://riversidechc.example.org" },
  },

  {
    id: HRSA_ORG_ID,
    name: "Health Resources and Services Administration",
    orgType: {
      term: "Government agencies",
      class: "Organization types",
      code: "EP000000",
    },
    identifiers: {
      otherIds: {
        "org:grants.gov:agency": {
          registry: { code: "org:grants.gov:agency" },
          id: "HRSA",
        },
      },
    },
    addresses: {
      primary: usAddress("5600 Fishers Ln", "Rockville", "MD", "20857"),
    },
    phones: { primary: usPhone("301-555-0100") },
    emails: { primary: "grants@hrsa.example.gov" },
    mission:
      "To improve health outcomes and address health disparities through access to quality services.",
    yearFounded: "1982",
    socials: { website: "https://www.hrsa.example.gov" },
  },

  {
    id: NSF_ORG_ID,
    name: "National Science Foundation",
    orgType: {
      term: "Government agencies",
      class: "Organization types",
      code: "EP000000",
    },
    identifiers: {
      otherIds: {
        "org:grants.gov:agency": {
          registry: { code: "org:grants.gov:agency" },
          id: "NSF",
        },
      },
    },
    addresses: {
      primary: usAddress("2415 Eisenhower Ave", "Alexandria", "VA", "22314"),
    },
    phones: { primary: usPhone("703-555-0111") },
    emails: { primary: "info@nsf.example.gov" },
    mission:
      "To promote the progress of science and advance the national health, prosperity, and welfare.",
    yearFounded: "1950",
    socials: { website: "https://www.nsf.example.gov" },
  },

  {
    id: CASCADE_WORKFORCE_ORG_ID,
    name: "Cascade Workforce Alliance",
    orgType: {
      term: "Employment services",
      class: "Organization types",
      code: "EJ000000",
    },
    identifiers: {
      systemId: {
        registry: {
          code: "org:grants.gov:system",
          url: "https://commongrants.org/registries/org-grants-gov-system",
        },
        id: CASCADE_WORKFORCE_ORG_ID,
      },
      "org:us:ein": ein("345678901"),
      "org:us:uei": uei("CD2345678901"),
      // Must match the scalar `duns` below.
      "org:xi:duns": dunsId("456789012"),
    },
    ein: "345678901",
    uei: "CD2345678901",
    duns: "456789012",
    addresses: {
      primary: usAddress("88 Pike St", "Seattle", "WA", "98101"),
      otherAddresses: {
        training: usAddress("41 Industrial Way", "Tacoma", "WA", "98402"),
      },
    },
    phones: { primary: usPhone("206-555-0173", true) },
    emails: {
      primary: "grants@cascadeworkforce.example.org",
      otherEmails: { programs: "programs@cascadeworkforce.example.org" },
    },
    mission:
      "To connect workers in the Puget Sound region with apprenticeships in the building trades.",
    yearFounded: "2003",
    socials: {
      website: "https://cascadeworkforce.example.org",
      linkedin: "https://www.linkedin.com/company/cascade-workforce",
    },
    customFields: {
      serviceArea: {
        name: "serviceArea",
        fieldType: "string",
        value: "King, Pierce, and Snohomish counties",
        description: "Counties the organization is funded to serve",
      },
    },
  },

  {
    id: LAKESIDE_ARTS_ORG_ID,
    name: "Lakeside Arts Collective",
    orgType: {
      term: "Arts and culture",
      class: "Organization types",
      code: "EA000000",
    },
    identifiers: { "org:us:ein": ein("456789012") },
    ein: "456789012",
    addresses: {
      primary: usAddress("310 Lakeshore Blvd", "Madison", "WI", "53703"),
    },
    phones: { primary: usPhone("608-555-0128") },
    emails: { primary: "hello@lakesidearts.example.org" },
    mission:
      "To preserve and present the folk arts traditions of the Upper Midwest.",
    yearFounded: "1991",
    socials: {
      website: "https://lakesidearts.example.org",
      instagram: "https://www.instagram.com/lakesidearts",
    },
  },

  {
    id: PRAIRIE_BROADBAND_ORG_ID,
    name: "Prairie Broadband Cooperative",
    orgType: {
      term: "Business and industry",
      class: "Organization types",
      code: "EB000000",
    },
    identifiers: {
      "org:us:ein": ein("567890123"),
      "org:us:uei": uei("EF3456789012"),
    },
    ein: "567890123",
    uei: "EF3456789012",
    addresses: {
      primary: usAddress("7 County Road 12", "Fargo", "ND", "58102"),
    },
    phones: { primary: usPhone("701-555-0190") },
    emails: { primary: "grants@prairiebroadband.example.coop" },
    mission:
      "To bring affordable high-speed internet to rural households across the northern plains.",
    yearFounded: "2016",
    socials: { website: "https://prairiebroadband.example.coop" },
  },

  {
    id: COASTAL_RESEARCH_ORG_ID,
    name: "Coastal Research Institute",
    orgType: {
      term: "Research institutes",
      class: "Organization types",
      code: "EH000000",
    },
    identifiers: {
      "org:us:ein": ein("678901234"),
      "org:us:uei": uei("GH4567890123"),
    },
    ein: "678901234",
    uei: "GH4567890123",
    addresses: {
      primary: usAddress("2 Harbor Way", "Portland", "ME", "04101"),
    },
    phones: { primary: usPhone("207-555-0155") },
    emails: { primary: "sponsored.programs@coastalresearch.example.edu" },
    mission:
      "To advance the science of coastal resilience and ocean health in the Gulf of Maine.",
    yearFounded: "1968",
    socials: {
      website: "https://coastalresearch.example.edu",
      bluesky: "https://bsky.app/profile/coastalresearch.example.edu",
    },
  },
]);

/**
 * The change history the `/changes` routes serve. The first entry carries
 * `CANONICAL_ORG_REVISION_ID` on the canonical org, which keeps the doubly
 * pre-filled `GET /orgs/{orgId}/changes/{changeId}` resolving. `snapshot` is
 * omitted on `pending` and `denied` changes on purpose: a change that was
 * never applied has no snapshot.
 */
export const ORG_REVISION_FIXTURES: readonly OrgRevision[] = Object.freeze<
  OrgRevision[]
>([
  {
    id: CANONICAL_ORG_REVISION_ID,
    orgId: CANONICAL_ORGANIZATION_ID,
    status: { value: "accepted", description: "The change was applied." },
    source: "grants.gov",
    patch: { mission: "To provide support and resources to the community." },
    snapshot: ORGANIZATION_FIXTURES[0],
    createdAt: "2026-05-02T00:00:00Z",
    lastModifiedAt: "2026-05-02T00:00:00Z",
  },
  {
    id: "0a1b2c3d-4e5f-4061-8a7b-8c9d0e1f2031",
    orgId: CANONICAL_ORGANIZATION_ID,
    status: {
      value: "pending",
      description: "The change is queued for review.",
    },
    source: "sam.gov",
    patch: {
      phones: { primary: { countryCode: "+1", number: "444-456-9999" } },
    },
    createdAt: "2026-06-11T00:00:00Z",
    lastModifiedAt: "2026-06-11T00:00:00Z",
  },
  {
    id: "1b2c3d4e-5f60-4172-8b8c-9d0e1f203142",
    orgId: CANONICAL_ORGANIZATION_ID,
    status: {
      value: "superseded",
      description: "A competing change was accepted first.",
    },
    source: "grants.gov",
    patch: { yearFounded: "2023" },
    createdAt: "2026-04-18T00:00:00Z",
    lastModifiedAt: "2026-05-02T00:00:00Z",
  },
  {
    id: "2c3d4e5f-6071-4283-8c9d-0e1f20314253",
    orgId: DOCUMENTED_ORGANIZATION_ID,
    status: {
      value: "denied",
      description: "The submitted EIN did not match IRS records.",
    },
    source: "partner-portal",
    patch: { ein: "999999999" },
    createdAt: "2026-03-07T00:00:00Z",
    lastModifiedAt: "2026-03-09T00:00:00Z",
  },
  {
    id: "3d4e5f60-7182-4394-8d0e-1f2031425364",
    orgId: CASCADE_WORKFORCE_ORG_ID,
    status: {
      value: "custom",
      customValue: "escalated",
      description: "The change was escalated for additional review.",
    },
    source: "sam.gov",
    patch: {
      addresses: {
        primary: {
          street1: "88 Pike St",
          street2: "Floor 4",
          city: "Seattle",
          stateOrProvince: "WA",
          country: "US",
          postalCode: "98101",
        },
      },
    },
    createdAt: "2026-06-20T00:00:00Z",
    lastModifiedAt: "2026-06-22T00:00:00Z",
  },
]);

/** Looks up an organization fixture by its exact id. */
export function getOrganizationById(id: string): Organization | undefined {
  return ORGANIZATION_FIXTURES.find((org) => org.id === id);
}

/** Every organization fixture, as a mutable copy handlers can sort and page. */
export function allOrganizations(): Organization[] {
  return [...ORGANIZATION_FIXTURES];
}

/**
 * Builds an `OrgRef` from the real record. Throws on an unknown id on
 * purpose: a dangling reference should fail at module load.
 */
export function orgRef(id: string): OrgRef {
  const org = getOrganizationById(id);
  if (!org) {
    throw new Error(`Fixture references unknown organization id ${id}`);
  }
  return {
    id: org.id,
    name: org.name,
    ...(org.identifiers === undefined ? {} : { identifiers: org.identifiers }),
  };
}

/** Builds an `OrgRefCollection` from a primary id and optional keyed others. */
export function orgRefCollection(
  primaryId: string,
  otherOrgs?: Record<string, string>,
): OrgRefCollection {
  const collection: OrgRefCollection = { primary: orgRef(primaryId) };
  if (otherOrgs !== undefined) {
    collection.otherOrgs = Object.fromEntries(
      Object.entries(otherOrgs).map(([key, id]) => [key, orgRef(id)]),
    );
  }
  return collection;
}

/** The revisions belonging to one organization, newest first. */
export function revisionsForOrg(orgId: string): OrgRevision[] {
  return ORG_REVISION_FIXTURES.filter(
    (revision) => revision.orgId === orgId,
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Looks up one revision, scoped to the organization it belongs to. */
export function getRevision(
  orgId: string,
  changeId: string,
): OrgRevision | undefined {
  return ORG_REVISION_FIXTURES.find(
    (revision) => revision.orgId === orgId && revision.id === changeId,
  );
}

/**
 * Projects a revision to the wire shape, dropping the fixture-only `orgId`.
 * Every served revision must pass through here. Built as an allowlist so a
 * future fixture-only field cannot leak onto the wire.
 */
export function shapeRevision(revision: OrgRevision): WireOrgRevision {
  return {
    id: revision.id,
    status: revision.status,
    ...(revision.source === undefined ? {} : { source: revision.source }),
    ...(revision.patch === undefined ? {} : { patch: revision.patch }),
    ...(revision.snapshot === undefined ? {} : { snapshot: revision.snapshot }),
    createdAt: revision.createdAt,
    lastModifiedAt: revision.lastModifiedAt,
  };
}
