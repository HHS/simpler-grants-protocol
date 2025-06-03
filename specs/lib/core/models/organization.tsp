import "../fields/index.tsp";

namespace CommonGrants.Models;

/** An organization that can apply for grants. */
@example(Examples.Organization.exampleOrg)
model OrganizationBase {
  /** The organization's legal name as registered with relevant authorities. */
  name: string;

  /** The organization's primary mailing address. */
  address: Fields.Address;

  /** The organization's type (e.g., "Nonprofit", "For-Profit", "Government", "Educational"). */
  type: Fields.PCSOrgType;

  /** The organization's Employer Identification Number (EIN), a unique identifier assigned by the IRS. */
  ein?: string;

  /** The organization's Unique Entity Identifier (UEI) from SAM.gov, used for federal contracting. */
  uei?: string;

  /** The organization's Data Universal Numbering System (DUNS) number, a unique identifier for businesses. */
  duns?: string;

  /** The organization's mission statement. */
  mission?: string;

  /** The calendar year the organization was founded. */
  yearFounded?: integer;

  /** Collection of the organization's social media and web presence links. */
  socials?: OrgSocialLinks;

  /** Custom fields for the organization. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// OrgSocialLinks
// #########################################################

/** A collection of social media and web presence links for an organization. */
@example(#{
  website: "https://www.example.com",
  facebook: "https://www.facebook.com/example",
  twitter: "https://x.com/example",
  instagram: "https://www.instagram.com/example",
  linkedin: "https://www.linkedin.com/company/example",
  otherSocials: #{ youtube: "https://www.youtube.com/example" },
})
model OrgSocialLinks {
  /** The organization's primary website URL. */
  website?: url;

  /** The organization's Facebook profile URL. */
  facebook?: url;

  /** The organization's Twitter/X profile URL. */
  twitter?: url;

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
    name: "Example Organization",
    address: Fields.Examples.Address.mainStreet,
    type: Fields.Examples.PCS.orgTypeTerm,
    ein: "123456789",
    uei: "123456789",
    duns: "123456789",
    mission: "To provide support and resources to the community.",
    yearFounded: 2024,
    socials: exampleSocials,
  };

  const exampleSocials = #{
    website: "https://www.example.com",
    facebook: "https://www.facebook.com/example",
    twitter: "https://x.com/example",
    instagram: "https://www.instagram.com/example",
    linkedin: "https://www.linkedin.com/company/example",
    otherSocials: #{ youtube: "https://www.youtube.com/example" },
  };
}
