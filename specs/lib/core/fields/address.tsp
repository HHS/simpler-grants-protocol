namespace CommonGrants.Fields;

/** An mailing address. */
@example(Examples.Address.mainStreet)
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

namespace Examples.Address {
  const mainStreet = #{
    street1: "123 Main St",
    city: "Anytown",
    stateOrProvince: "CA",
    country: "US",
    postalCode: "12345",
  };
}
