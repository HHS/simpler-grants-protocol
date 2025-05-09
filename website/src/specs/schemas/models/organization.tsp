import "../fields/index.tsp";
import "./person.tsp";

namespace CommonGrants.Models;

/** An organization that can apply for grants. */
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
    yearFounded?: numeric;

    /** The start date of the organization's fiscal year, used for financial reporting. */
    @example(plainDate.fromISO("2024-01-01"))
    fiscalYearStart?: plainDate;

    /** The end date of the organization's fiscal year, used for financial reporting. */
    fiscalYearEnd?: plainDate;

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

    /** Contact information for the organization's representatives. */
    contacts: {
        /** The primary point of contact for the organization. */
        pointOfContact: Person;

        /** Additional contacts within the organization, keyed by their role or relationship. */
        otherContacts?: Record<Person>;
    };
}
