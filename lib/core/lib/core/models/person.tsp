import "../fields/index.tsp";
import "../types.tsp";

namespace CommonGrants.Models;

/** A person affiliated with an organization or grant application. */
@example(Examples.Person.examplePerson)
@Versioning.added(CommonGrants.Versions.v0_2)
model PersonBase {
  /** The person's full name, including all relevant components (first, middle, last, etc.). */
  name: Fields.Name;

  /** The person's title, if applicable. */
  title?: string;

  /** Collection of physical addresses associated with the person. */
  addresses?: Fields.AddressCollection;

  /** Collection of phone numbers associated with the person. */
  phones?: Fields.PhoneCollection;

  /** Collection of email addresses associated with the person. */
  emails?: Fields.EmailCollection;

  /** The person's date of birth. */
  dateOfBirth?: Types.isoDate;

  /** Custom fields for the person. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Person {
  const examplePerson = #{
    name: Fields.Examples.Name.janeDoe,
    title: "Chief Executive Officer",
    addresses: Fields.Examples.Address.personalCollection,
    phones: Fields.Examples.Phone.personalCollection,
    emails: Fields.Examples.Email.personalCollection,
  };
}
