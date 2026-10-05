import "@typespec/openapi";
import "../fields/index.tsp";

namespace CommonGrants.Models;

/** An organization that can apply for grants. */
@example(Examples.Organization.exampleOrg)
@Versioning.added(CommonGrants.Versions.v0_2)
model OrganizationBase {
  // Identity fields shared with the OrgRef reference model
  ...OrgRef;

  /** The organization's type within the Philanthropy Classification System (PCS). */
  orgType?: Fields.PCSOrgType;

  /** The organization's Employer Identification Number (EIN), a unique identifier assigned by the IRS. */
  @Versioning.removed(CommonGrants.Versions.v0_4)
  ein?: Types.employerTaxId;

  /** The organization's Unique Entity Identifier (UEI) from SAM.gov, used for federal contracting. */
  @Versioning.removed(CommonGrants.Versions.v0_4)
  uei?: Types.samUEI;

  /** The organization's Data Universal Numbering System (DUNS) number, a unique identifier for businesses. */
  @Versioning.removed(CommonGrants.Versions.v0_4)
  duns?: Types.duns;

  /** Collection of physical addresses associated with the organization. */
  addresses?: Fields.AddressCollection;

  /** Collection of phone numbers associated with the organization. */
  phones?: Fields.PhoneCollection;

  /** Collection of email addresses associated with the organization. */
  emails?: Fields.EmailCollection;

  /** The organization's mission statement. */
  mission?: string;

  /** The calendar year the organization was founded. */
  yearFounded?: Types.calendarYear;

  /** Collection of the organization's social media and web presence links. */
  socials?: OrgSocialLinks;

  /** Names the organization currently does business as, alongside its legal `name`. Not a history of former names. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  dbaNames?: string[] | null;

  /** The organization's relationships to other organizations. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  relationships?:
    | {
        ...OrgRelationships;
      }
    | null;

  /** Custom fields for the organization. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// Organization identifiers
// #########################################################

/** An organization's Employer Identification Number (EIN), assigned by the IRS. */
@example(Examples.OrgId.ein)
@Versioning.added(CommonGrants.Versions.v0_4)
model OrgIdEin is Fields.IdentifierT<Types.employerTaxId, "org:us:ein">;

/** An organization's Unique Entity Identifier (UEI) from SAM.gov. */
@example(Examples.OrgId.uei)
@Versioning.added(CommonGrants.Versions.v0_4)
model OrgIdUei is Fields.IdentifierT<Types.samUEI, "org:us:uei">;

/** An organization's Data Universal Numbering System (DUNS) number. */
@example(Examples.OrgId.duns)
@Versioning.added(CommonGrants.Versions.v0_4)
model OrgIdDuns is Fields.IdentifierT<Types.duns, "org:xi:duns">;

/** A collection of identifiers associated with an organization.
 *
 * Extends the generic identifier collection with the base identifiers CommonGrants
 * defines for organizations. Additional registries can be published under `otherIds`.
 */
@Versioning.added(CommonGrants.Versions.v0_4)
model OrgIds extends Fields.IdentifierCollection {
  /** The organization's Employer Identification Number (EIN), assigned by the IRS. */
  `org:us:ein`?: OrgIdEin;

  /** The organization's Unique Entity Identifier (UEI) from SAM.gov. */
  `org:us:uei`?: OrgIdUei;

  /** The organization's Data Universal Numbering System (DUNS) number. */
  `org:xi:duns`?: OrgIdDuns;
}

// #########################################################
// Organization references
// #########################################################

/** A reference to an organization, previewing the key fields a consumer needs
 * to identify it and look it up or join it to another response. Appears
 * wherever another record points to an organization, such as an award's funder
 * or recipient.
 */
@example(Examples.OrgRef.funder)
@Versioning.added(CommonGrants.Versions.v0_2)
model OrgRef {
  /** The organization's unique identifier. */
  @visibility(Lifecycle.Read)
  id: Types.uuid;

  /** The organization's legal name as registered with relevant authorities. */
  name: string;

  /** Identifiers associated with the organization, keyed by registry code. */
  @Versioning.added(CommonGrants.Versions.v0_4)
  identifiers?: OrgIds;
}

/** A group of organization references, with a primary organization and
 * optional others. Appears wherever several organizations share a role on a
 * record, such as an award's funders or recipient organizations.
 */
@example(Examples.OrgRef.funders)
@Versioning.added(CommonGrants.Versions.v0_4)
model OrgRefCollection {
  /** The primary organization in the collection. */
  primary: OrgRef;

  /** Other organizations in the collection, keyed by an implementation-defined role. */
  otherOrgs?: Record<OrgRef>;
}

// #########################################################
// Organization relationships
// #########################################################

// OpenAPI 3.0 cannot make a `$ref` nullable: `nullable` beside an `allOf`
// reference does not stop the referenced schema from rejecting `null`. So the
// nullable members that would reference a model, scalar, or enum
// (`relationships`, `kind`, the dates, and `status`) are written inline.
//
// `nullable` also leaves `enum` in force, so an OpenAPI 3.0 enum accepts
// `null` only when `null` is one of its values. The OpenAPI 3.0 emitter leaves
// it out, so `status` lists its values, `null` included, in an OpenAPI
// `enum` that replaces the emitted one. JSON Schema is unaffected.
// `org-relationships.test.ts` fails if either dialect stops accepting `null`.

/** The standard subtypes of a parent or child relationship:
 * - `chapter`: The child is a chapter of the parent
 * - `department`: The child is an internal unit of the parent
 * - `branch`: The child is a branch of the parent
 * - `subsidiary`: The child is a subsidiary of the parent
 * - `fiscalSponsor`: The parent fiscally sponsors the child
 * - `custom`: Another subtype, named in `customValue`
 */
@Versioning.added(CommonGrants.Versions.v0_5)
enum OrgHierarchyKindOptions {
  chapter,
  department,
  branch,
  subsidiary,
  fiscalSponsor,
  custom,
}

/** The standard subtypes of organizational succession:
 * - `merger`: Succession through a merger
 * - `acquisition`: Succession through an acquisition
 * - `divestiture`: Succession through a divestiture
 * - `split`: Succession through a split into several organizations
 * - `custom`: Another subtype, named in `customValue`
 */
@Versioning.added(CommonGrants.Versions.v0_5)
enum OrgSuccessionKindOptions {
  merger,
  acquisition,
  divestiture,
  split,
  custom,
}

/** The standard subtypes of record replacement. A provider's workflow may
 * treat them alike; they need not be exclusive.
 * - `duplicate`: The records duplicate each other
 * - `merged`: The provider combined the records
 * - `custom`: Another subtype, named in `customValue`
 */
@Versioning.added(CommonGrants.Versions.v0_5)
enum OrgRecordKindOptions {
  duplicate,
  merged,
  custom,
}

/** Other relationships define no standard subtypes, so a stated subtype is `custom`. */
@Versioning.added(CommonGrants.Versions.v0_5)
enum OrgOtherKindOptions {
  custom,
}

/** A relationship from this organization to another organization.
 *
 * The list holding the entry gives its category and, for the named lists, its
 * direction; `kind` optionally narrows that to a subtype. `org` identifies
 * the other organization, while the remaining fields describe the
 * relationship itself. `status` is only what the provider states: it has no
 * default and is not derived from the dates.
 *
 * @template Kind The standard subtypes accepted for `kind.value`.
 */
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgRelationshipT<Kind> {
  /** The other organization. */
  org: OrgRef;

  /** The relationship's subtype within the category its list names. */
  kind?:
    | {
        ...Fields.ExtensibleEnumT<Kind>;
      }
    | null;

  /** When the relationship started, in ISO 8601 format: YYYY-MM-DD */
  @example(Types.isoDate.fromISO("2024-07-01"))
  startDate?: plainDate | null;

  /** When the relationship ended, in ISO 8601 format: YYYY-MM-DD */
  @example(Types.isoDate.fromISO("2026-06-30"))
  endDate?: plainDate | null;

  /** Whether the relationship is in effect, as stated by the provider. */
  @TypeSpec.OpenAPI.extension("enum", #["active", "inactive", null])
  status?: "active" | "inactive" | null;
}

/** A parent or child relationship. */
@example(Examples.OrgRelationships.sponsor)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgHierarchyRelationship is OrgRelationshipT<OrgHierarchyKindOptions>;

/** A succession relationship. */
@example(Examples.OrgRelationships.split)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgSuccessionRelationship is OrgRelationshipT<OrgSuccessionKindOptions>;

/** A record replacement relationship. */
@example(Examples.OrgRelationships.duplicate)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgRecordRelationship is OrgRelationshipT<OrgRecordKindOptions>;

/** A relationship outside the named categories, which need not have a direction. */
@example(Examples.OrgRelationships.connection)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgOtherRelationship is OrgRelationshipT<OrgOtherKindOptions>;

/** An organization's relationships to other organizations.
 *
 * Each named list holds relationships of one category and direction;
 * `otherRelationships` holds connections outside those categories. Every list
 * is optional, list order carries no meaning, and a provider may state a
 * relationship from either organization's record. A relationship confers no
 * authority over the other organization.
 */
@example(Examples.OrgRelationships.sponsoredChapter)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgRelationships {
  /** Organizations above this one, such as a containing organization or a fiscal sponsor. */
  parents?: OrgHierarchyRelationship[] | null;

  /** Organizations below this one, such as its chapters or sponsored projects. */
  children?: OrgHierarchyRelationship[] | null;

  /** Organizations that carry on all or part of this one. */
  succeededBy?: OrgSuccessionRelationship[] | null;

  /** Organizations whose work this one carries on in whole or in part. */
  succeeds?: OrgSuccessionRelationship[] | null;

  /** Records to use instead of this record. */
  recordReplacedBy?: OrgRecordRelationship[] | null;

  /** Records that this record is used instead of. */
  recordReplaces?: OrgRecordRelationship[] | null;

  /** Connections outside the categories above, which need not have a direction. */
  otherRelationships?: OrgOtherRelationship[] | null;
}

// #########################################################
// OrgSocialLinks
// #########################################################

/** A collection of social media and web presence links for an organization. */
@example(Examples.Organization.exampleSocials)
@Versioning.added(CommonGrants.Versions.v0_2)
model OrgSocialLinks {
  /** The organization's primary website URL. */
  website?: url;

  /** The organization's Facebook profile URL. */
  facebook?: url;

  /** The organization's Twitter/X profile URL. */
  twitterOrX?: url;

  /** The organization's BlueSky profile URL. */
  bluesky?: url;

  /** The organization's Instagram profile URL. */
  instagram?: url;

  /** The organization's LinkedIn profile URL. */
  linkedin?: url;

  /** Additional social media profiles not covered by the standard fields. */
  otherSocials?: Record<url>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Organization {
  const exampleOrg = #{
    id: "083b4567-e89d-42c8-a439-6c1234567890",
    name: "Example Organization",
    orgType: Fields.Examples.PCS.orgTypeTerm,
    identifiers: #{
      `org:us:ein`: #{
        registry: #{
          code: "org:us:ein",
          url: "https://commongrants.org/registries/org-us-ein",
        },
        id: "123456789",
      },
      `org:us:uei`: #{
        registry: #{
          code: "org:us:uei",
          url: "https://commongrants.org/registries/org-us-uei",
        },
        id: "AB0123456789",
      },
    },
    addresses: Fields.Examples.Address.orgCollection,
    phones: Fields.Examples.Phone.orgCollection,
    emails: Fields.Examples.Email.orgCollection,
    mission: "To provide support and resources to the community.",
    yearFounded: "2024",
    socials: exampleSocials,
  };

  const exampleSocials = #{
    website: "https://www.example.com",
    facebook: "https://www.facebook.com/example",
    twitterOrX: "https://x.com/example",
    instagram: "https://www.instagram.com/example",
    linkedin: "https://www.linkedin.com/company/example",
    otherSocials: #{ youtube: "https://www.youtube.com/example" },
  };
}

namespace Examples.OrgId {
  const ein = #{
    registry: #{
      code: "org:us:ein",
      url: "https://commongrants.org/registries/org-us-ein",
    },
    id: "123456789",
  };

  const uei = #{
    registry: #{
      code: "org:us:uei",
      url: "https://commongrants.org/registries/org-us-uei",
    },
    id: "AB0123456789",
  };

  const duns = #{
    registry: #{
      code: "org:xi:duns",
      url: "https://commongrants.org/registries/org-xi-duns",
    },
    id: "123456789",
  };
}

namespace Examples.OrgRef {
  const funder = #{
    id: "018f2e77-4b5c-7d2e-9f3a-bcdef1234567",
    name: "Health Resources and Services Administration",
    identifiers: #{
      otherIds: #{
        `org:grants.gov:agency`: #{
          registry: #{ code: "org:grants.gov:agency" },
          id: "HRSA",
        },
      },
    },
  };

  const recipient = #{
    id: "018f2e77-6d7e-7f4a-9b5c-def123456789",
    name: "Riverside Community Health Center",
    identifiers: #{
      `org:us:ein`: #{ registry: #{ code: "org:us:ein" }, id: "123456789" },
    },
  };

  const funders = #{ primary: funder };

  const recipients = #{ primary: recipient };
}

/** Illustrative examples of organization relationships, not real records. */
namespace Examples.OrgRelationships {
  const chapter = #{
    org: #{
      id: "01912a8b-7c3d-7891-abcd-ef1234567891",
      name: "National Reading Network",
    },
    kind: #{ value: OrgHierarchyKindOptions.chapter },
  };

  const sponsor = #{
    org: #{
      id: "01912a8b-7c3d-7892-abcd-ef1234567892",
      name: "Riverside Community Foundation",
      identifiers: #{
        `org:us:ein`: #{ registry: #{ code: "org:us:ein" }, id: "123456789" },
      },
    },
    kind: #{ value: OrgHierarchyKindOptions.fiscalSponsor },
    startDate: Types.isoDate.fromISO("2024-07-01"),
    status: "active",
  };

  const split = #{
    org: #{
      id: "01912a8b-7c3d-7893-abcd-ef1234567893",
      name: "Riverside Reading East",
    },
    kind: #{ value: OrgSuccessionKindOptions.split },
    startDate: Types.isoDate.fromISO("2026-01-01"),
  };

  const duplicate = #{
    org: #{
      id: "01912a8b-7c3d-7894-abcd-ef1234567894",
      name: "Riverside Reading Project",
    },
    kind: #{ value: OrgRecordKindOptions.duplicate },
  };

  const connection = #{
    org: #{
      id: "01912a8b-7c3d-7895-abcd-ef1234567895",
      name: "Riverside Literacy Coalition",
    },
  };

  const sponsoredChapter = #{ parents: #[chapter, sponsor] };
}
