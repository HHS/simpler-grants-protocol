import "../fields/index.tsp";

namespace CommonGrants.Models;

/** A person affiliated with an organization or grant application. */
model Person {
    /** The person's full name, including all relevant components (first, middle, last, etc.). */
    name: Fields.Name;

    /** Collection of phone numbers associated with the person. */
    phones?: {
        /** The person's primary contact number. */
        primary: Fields.Phone;

        /** The person's work phone number. */
        work?: Fields.Phone;

        /** The person's home phone number. */
        home?: Fields.Phone;

        /** Additional phone numbers not covered by the standard fields. */
        otherPhones?: Record<Fields.Phone>;
    };

    /** The person's fax number, if applicable. */
    fax?: Fields.Phone;

    /** Collection of email addresses associated with the person. */
    emails?: {
        /** The person's primary email address. */
        primary: Fields.email;

        /** The person's work email address. */
        work?: Fields.email;

        /** The person's personal email address. */
        personal?: Fields.email;

        /** Additional email addresses not covered by the standard fields. */
        otherEmails?: Record<Fields.email>;
    };

    /** Collection of physical addresses associated with the person. */
    addresses?: {
        /** The person's primary mailing address. */
        mailing: Fields.Address;

        /** The person's work address. */
        work?: Fields.Address;

        /** The person's home address. */
        home?: Fields.Address;

        /** Additional addresses not covered by the standard fields. */
        otherAddresses?: Record<Fields.Address>;
    };
}
