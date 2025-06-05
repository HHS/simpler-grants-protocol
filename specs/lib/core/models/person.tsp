import "../fields/index.tsp";
import "../types.tsp";

namespace CommonGrants.Models;

/** A person affiliated with an organization or grant application. */
@example(Examples.Person.examplePerson)
model PersonBase {
  /** The person's full name, including all relevant components (first, middle, last, etc.). */
  name: Fields.Name;

  /** The person's title, if applicable. */
  title?: string;

  /** Collection of physical addresses associated with the person. */
  addresses?: PersonAddressCollection;

  /** Collection of phone numbers associated with the person. */
  phones?: Fields.PhoneCollection;

  /** Collection of email addresses associated with the person. */
  emails?: PersonEmailCollection;

  /** The person's date of birth. */
  dateOfBirth?: Types.isoDate;

  /** Custom fields for the person. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// Address Collection
// #########################################################

/** A collection of addresses for a person. */
@example(Examples.Person.exampleAddresses)
model PersonAddressCollection {
  /** The person's primary mailing address. */
  primary: Fields.Address;

  /** The person's work address. */
  work?: Fields.Address;

  /** The person's home address. */
  home?: Fields.Address;

  /** Additional addresses not covered by the standard fields. */
  otherAddresses?: Record<Fields.Address>;
}

// #########################################################
// Email Collection
// #########################################################

/** A collection of email addresses for a person. */
@example(Examples.Person.exampleEmails)
model PersonEmailCollection {
  /** The person's primary email address. */
  primary: Types.email;

  /** The person's work email address. */
  work?: Types.email;

  /** The person's personal email address. */
  personal?: Types.email;

  /** Additional email addresses not covered by the standard fields. */
  otherEmails?: Record<Types.email>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Person {
  const examplePerson = #{
    name: Fields.Examples.Name.janeDoe,
    title: "Chief Executive Officer",
    addresses: Examples.Person.exampleAddresses,
    phones: Fields.Examples.Phone.collection,
    emails: Examples.Person.exampleEmails,
  };

  const exampleAddresses = #{
    primary: Fields.Examples.Address.mainStreet,
    work: Fields.Examples.Address.mainStreet,
    home: Fields.Examples.Address.mainStreet,
  };

  const exampleEmails = #{
    primary: "john.doe@example.com",
    work: "john.doe@work.com",
    personal: "john.doe@gmail.com",
    otherEmails: #{ school: "john.doe@school.edu" },
  };
}
