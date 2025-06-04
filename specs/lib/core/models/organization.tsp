import "../fields/index.tsp";

namespace CommonGrants.Models;

/** An organization that can apply for grants. */
@example(Examples.Organization.exampleOrg)
model OrganizationBase {
  /** The organization's unique identifier. */
  id: Types.uuid;

  /** The organization's legal name as registered with relevant authorities. */
  name: string;

  /** The organization's primary mailing address. */
  address?: Fields.Address;

  /** The organization's type within the Philanthropy Classification System (PCS). */
  type?: Fields.PCSOrgType;

  /** The organization's Employer Identification Number (EIN), a unique identifier assigned by the IRS. */
  ein?: Types.employerTaxId;

  /** The organization's Unique Entity Identifier (UEI) from SAM.gov, used for federal contracting. */
  uei?: Types.samUEI;

  /** The organization's Data Universal Numbering System (DUNS) number, a unique identifier for businesses. */
  duns?: Types.duns;

  /** The organization's mission statement. */
  mission?: string;

  /** The calendar year the organization was founded. */
  yearFounded?: Types.calendarYear;

  /** Collection of the organization's social media and web presence links. */
  socials?: OrgSocialLinks;

  /** Custom fields for the organization. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// OrgSocialLinks
// #########################################################

/** A collection of social media and web presence links for an organization. */
@example(Examples.Organization.exampleSocials)
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
    address: Fields.Examples.Address.mainStreet,
    type: Fields.Examples.PCS.orgTypeTerm,
    ein: "12-3456789",
    uei: "ABC1234567890",
    duns: "123456789012",
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
