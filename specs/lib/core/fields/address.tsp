namespace CommonGrants.Fields;

/** An mailing address. */
@example(Examples.Address.apartment)
model Address {
  /** The primary street address line. */
  street1: string;

  /** Additional street address information (e.g., apartment number, suite, etc.). */
  street2?: string;

  /** The city or municipality name. */
  city: string;

  /** The state, province, or region name. */
  stateOrProvince: string;

  /** The country name or ISO country code. */
  country: string;

  /** The postal or ZIP code for the address. */
  postalCode: string;

  /** The latitude coordinate of the address location. */
  latitude?: numeric;

  /** The longitude coordinate of the address location. */
  longitude?: numeric;

  /** Additional geospatial data in GeoJSON format. */
  geography?: Record<unknown>;
}

/** A collection of addresses. */
@example(Examples.Address.personalCollection)
@example(Examples.Address.orgCollection)
model AddressCollection {
  /** The primary address for a person or organization. */
  primary: Address;

  /** Additional addresses keyed by a descriptive label (e.g., "work", "home", "international"). */
  otherAddresses?: Record<Address>;
}

namespace Examples.Address {
  const apartment = #{
    street1: "123 Main St",
    city: "Anytown",
    stateOrProvince: "CA",
    country: "US",
    postalCode: "12345",
  };

  const orgAddress = #{
    street1: "456 Main St",
    street2: "Suite 100",
    city: "Anytown",
    stateOrProvince: "CA",
    country: "US",
    postalCode: "12345",
  };

  const international = #{
    street1: "123 Rue Principale",
    city: "Montreal",
    stateOrProvince: "QC",
    country: "CA",
    postalCode: "H2Y 1C6",
  };

  const personalCollection = #{
    primary: Examples.Address.apartment,
    otherAddresses: #{
      work: Examples.Address.apartment,
      home: Examples.Address.apartment,
    },
  };

  const orgCollection = #{
    primary: Examples.Address.orgAddress,
    otherAddresses: #{
      satellite: Examples.Address.orgAddress,
      international: Examples.Address.international,
    },
  };
}
