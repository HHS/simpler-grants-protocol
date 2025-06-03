import "../fields/index.tsp";

namespace CommonGrants.Models;

/** An organization that can apply for grants. */
@example(#{
  name: "Example Organization",
  address: Fields.Examples.Address.mainStreet,
  type: "Nonprofit",
  ein: "123456789",
  uei: "123456789",
  duns: "123456789",
  mission: "To provide support and resources to the community.",
  yearFounded: 2024,
  fiscalYearStart: "10-01",
})
model Organization {
  /** The organization's legal name as registered with relevant authorities. */
  name: string;

  /** The organization's primary mailing address. */
  address: Fields.Address;

  /** The organization's type (e.g., "Nonprofit", "For-Profit", "Government", "Educational"). */
  type: string;

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

  /** The the month and day (MM-DD) on which the organization's fiscal year starts, used for financial reporting. */
  @example("01-01")
  @pattern("^[0-9]{2}-[0-9]{2}$", "Must be in the format MM-DD")
  fiscalYearStart?: string;

  /** Collection of the organization's social media and web presence links. */
  socials?: {
    /** The organization's primary website URL. */
    website?: string;

    /** The organization's Facebook profile URL. */
    facebook?: string;

    /** The organization's Twitter/X profile URL. */
    twitter?: string;

    /** The organization's Instagram profile URL. */
    instagram?: string;

    /** The organization's LinkedIn profile URL. */
    linkedin?: string;

    /** Additional social media profiles not covered by the standard fields. */
    otherSocials?: Record<string>;
  };
}
