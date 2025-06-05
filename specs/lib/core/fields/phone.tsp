namespace CommonGrants.Fields;

/** A phone number. */
@example(Examples.Phone.mobile)
@example(Examples.Phone.withExtension)
model Phone {
  /** The international country code (e.g., "+1" for US/Canada). */
  @pattern("^\\+[1-9][0-9]{1,3}$")
  countryCode: string;

  /** The local phone number without the country code. */
  number: string;

  /** Optional extension number for the phone line. */
  extension?: string;

  /** Indicates whether this is a mobile/cell phone number. */
  isMobile?: boolean = false;
}

// #########################################################
// Phone Collection
// #########################################################

/** A collection of phone numbers for a person. */
@example(Examples.Phone.collection)
model PhoneCollection {
  /** The person's primary phone number. */
  primary: Fields.Phone;

  /** The person's fax number, if applicable. */
  fax?: Fields.Phone;

  /** Additional phone numbers not covered by the standard fields. */
  otherPhones?: Record<Fields.Phone>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Phone {
  const mobile = #{ countryCode: "+1", number: "444-456-1230", isMobile: true };

  const home = #{ countryCode: "+1", number: "333-456-1230", isMobile: false };

  const withExtension = #{
    countryCode: "+1",
    number: "555-123-4567",
    extension: "123",
    isMobile: false,
  };

  const collection = #{
    primary: mobile,
    fax: withExtension,
    otherPhones: #{ home: home },
  };
}
