import "../fields/index.tsp";
import "../fields/name.tsp";
import "../fields/phone.tsp";
import "../fields/address.tsp";

namespace CommonGrants.Models;

/** A person affiliated with an organization or grant application. */
@example(#{
    name: Fields.ExampleName,
    title: "Chief Executive Officer",
    addresses: ExampleAddressCollection,
    phones: ExamplePhoneCollection,
    fax: Fields.ExamplePhone,
    emails: ExampleEmailCollection,
})
model Person {
    /** The person's full name, including all relevant components (first, middle, last, etc.). */
    name: Fields.Name;

    /** The person's title, if applicable. */
    title?: string;

    /** Collection of physical addresses associated with the person. */
    addresses?: PersonAddressCollection;

    /** Collection of phone numbers associated with the person. */
    phones?: PersonPhoneCollection;

    /** The person's fax number, if applicable. */
    fax?: Fields.Phone;

    /** Collection of email addresses associated with the person. */
    emails?: PersonEmailCollection;
}

// #########################################################
// Address Collection
// #########################################################

/** A collection of addresses for a person. */
@example(ExampleAddressCollection)
model PersonAddressCollection {
    /** The person's primary mailing address. */
    mailing: Fields.Address;

    /** The person's work address. */
    work?: Fields.Address;

    /** The person's home address. */
    home?: Fields.Address;

    /** Additional addresses not covered by the standard fields. */
    otherAddresses?: Record<Fields.Address>;
}

// #########################################################
// Phone Collection
// #########################################################

/** A collection of phone numbers for a person. */
@example(ExamplePhoneCollection)
model PersonPhoneCollection {
    /** The person's primary phone number. */
    primary: Fields.Phone;

    /** The person's work phone number. */
    work?: Fields.Phone;

    /** The person's home phone number. */
    home?: Fields.Phone;

    /** Additional phone numbers not covered by the standard fields. */
    otherPhones?: Record<Fields.Phone>;
}

// #########################################################
// Email Collection
// #########################################################

/** A collection of email addresses for a person. */
@example(ExampleEmailCollection)
model PersonEmailCollection {
    /** The person's primary email address. */
    primary: Fields.email;

    /** The person's work email address. */
    work?: Fields.email;

    /** The person's personal email address. */
    personal?: Fields.email;

    /** Additional email addresses not covered by the standard fields. */
    otherEmails?: Record<Fields.email>;
}

// #########################################################
// Examples
// #########################################################

const ExampleAddressCollection = #{
    mailing: Fields.ExampleAddress,
    work: Fields.ExampleAddress,
    home: Fields.ExampleAddress,
};

const ExamplePhoneCollection = #{
    primary: Fields.ExamplePhone,
    work: Fields.ExamplePhone,
    home: Fields.ExamplePhone,
    otherPhones: #{
        international: #{ countryCode: "+44", number: "7700 900000" },
    },
};

const ExampleEmailCollection = #{
    primary: "john.doe@example.com",
    work: "john.doe@work.com",
    personal: "john.doe@gmail.com",
    otherEmails: #{ school: "john.doe@school.edu" },
};
