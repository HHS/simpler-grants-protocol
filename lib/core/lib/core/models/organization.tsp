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

  /** The organization's relationships to other organizations, such as containing organizations or a fiscal sponsor. */
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

// Nullable object members (`relationships`, `parents`, and the singular
// references) spread their model inline rather than referencing it. OpenAPI 3.0
// cannot make a `$ref` nullable: `nullable` beside an `allOf` reference does
// not stop the referenced object from rejecting `null`.

/** An organization's relationships to other organizations.
 *
 * Every reference is stated on this organization and points to its target.
 * Hierarchy is grouped by kind under `parents`; fiscal sponsorship,
 * succession, and duplicate identity are distinct singular references. A
 * relationship confers no authority over its target.
 */
@example(Examples.OrgRelationships.sponsoredDepartment)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgRelationships {
  /** Organizations that directly contain this organization, grouped by hierarchy kind. */
  parents?:
    | {
        ...OrgParents;
      }
    | null;

  /** The organization that fiscally sponsors this organization or project. A payee designation alone does not establish sponsorship. */
  fiscalSponsor?:
    | {
        ...OrgRef;
      }
    | null;

  /** A different organization that replaces this dissolved organization. A rename or sponsor change alone does not establish succession. */
  successor?:
    | {
        ...OrgRef;
      }
    | null;

  /** The canonical record of the same organization, when this record is a duplicate of it. */
  duplicateOf?:
    | {
        ...OrgRef;
      }
    | null;

  /** Additional nonhierarchical relationships, keyed by a documented label. Must not hold containment, fiscal sponsors, successors, or duplicate targets. */
  otherRelationships?: Record<OrgRef[]> | null;
}

/** Organizations that directly contain an organization, grouped by hierarchy kind.
 *
 * Each kind holds an array so several targets can share a kind; array order
 * carries no primary-parent or ranking meaning. Use the most specific known
 * kind, and do not repeat a target as both `parent` and a more specific kind.
 */
@example(Examples.OrgRelationships.departmentParents)
@Versioning.added(CommonGrants.Versions.v0_5)
model OrgParents {
  /** Confirmed containment when no more specific supported kind is known. */
  parent?: OrgRef[] | null;

  /** An internal organizational unit within the target, such as a division or school. */
  department?: OrgRef[] | null;

  /** A local or regional unit under the target's organizational structure, not merely a member of its network. */
  chapter?: OrgRef[] | null;

  /** A separate entity owned or controlled by the target. */
  subsidiary?: OrgRef[] | null;

  /** Additional hierarchy kinds, keyed by a documented label that describes containment by the target. */
  otherParents?: Record<OrgRef[]> | null;
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
  const medicalCenter = #{
    id: "6f1d2c3b-4a59-4e68-8a7b-9c0d1e2f3a4b",
    name: "Example Medical Center",
    identifiers: #{
      `org:us:ein`: #{ registry: #{ code: "org:us:ein" }, id: "123456789" },
    },
  };

  const communityFoundation = #{
    id: "8b3f4e5d-6c7b-4a8a-8c9d-1e2f3a4b5c6d",
    name: "Example Community Foundation",
  };

  const departmentParents = #{ department: #[medicalCenter] };

  const sponsoredDepartment = #{
    parents: departmentParents,
    fiscalSponsor: communityFoundation,
  };
}
