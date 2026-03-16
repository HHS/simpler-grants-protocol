import "@typespec/json-schema";
import "./index.tsp";

using JsonSchema;

namespace QuestionBank.QuestionAddress;

/** US States, territories, and an option for non-US addresses */
enum USState {
  AL: "AL",
  AK: "AK",
  AZ: "AZ",
  AR: "AR",
  CA: "CA",
  CO: "CO",
  CT: "CT",
  DE: "DE",
  FL: "FL",
  GA: "GA",
  HI: "HI",
  ID: "ID",
  IL: "IL",
  IN: "IN",
  IA: "IA",
  KS: "KS",
  KY: "KY",
  LA: "LA",
  ME: "ME",
  MD: "MD",
  MA: "MA",
  MI: "MI",
  MN: "MN",
  MS: "MS",
  MO: "MO",
  MT: "MT",
  NE: "NE",
  NV: "NV",
  NH: "NH",
  NJ: "NJ",
  NM: "NM",
  NY: "NY",
  NC: "NC",
  ND: "ND",
  OH: "OH",
  OK: "OK",
  OR: "OR",
  PA: "PA",
  RI: "RI",
  SC: "SC",
  SD: "SD",
  TN: "TN",
  TX: "TX",
  UT: "UT",
  VT: "VT",
  VA: "VA",
  WA: "WA",
  WV: "WV",
  WI: "WI",
  WY: "WY",
  DC: "DC",
  AS: "AS",
  GU: "GU",
  MP: "MP",
  PR: "PR",
  VI: "VI",
  OutsideTheUS: "Outside the US",
}

/** A generic address question with US state dropdown and conditional state/province */
@extension("x-tags", #[Tags.address])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{ field: "street1" },
    street2: #{ field: "street2" },
    city: #{ field: "city" },
    state: #{ field: "stateOrProvince" },
    country: #{ field: "country" },
    postalCode: #{ field: "postalCode" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    street1: #{ field: "street1" },
    street2: #{ field: "street2" },
    city: #{ field: "city" },
    stateOrProvince: #{ field: "state" },
    country: #{ field: "country" },
    postalCode: #{ field: "postalCode" },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Address",
    elements: #[
      #{ type: "Control", scope: "#/properties/street1", label: "Street Address (Line 1)" },
      #{ type: "Control", scope: "#/properties/street2", label: "Street Address (Line 2)" },
      #{ type: "Control", scope: "#/properties/city", label: "City" },
      #{ type: "Control", scope: "#/properties/state", label: "State" },
      #{
        type: "Control",
        scope: "#/properties/stateOrProvince",
        label: "State or Province",
        rule: #{
          effect: "SHOW",
          condition: #{
            scope: "#/properties/state",
            schema: #{ pattern: "^Outside the US$" },
          },
        },
      },
      #{ type: "Control", scope: "#/properties/country", label: "Country" },
      #{ type: "Control", scope: "#/properties/postalCode", label: "Postal Code" }
    ],
  }
)
@example(#{
  street1: "456 Main St",
  street2: "Suite 100",
  city: "Anytown",
  state: USState.CA,
  country: "US",
  postalCode: "12345",
})
model QuestionAddress {
  /** The primary street address line */
  street1: string;

  /** Additional street address information */
  street2?: string;

  /** The city or municipality */
  city: string;

  /** The US state, territory, or "Outside the US" */
  state: USState;

  /** State or province name (for non-US addresses) */
  stateOrProvince?: string;

  /** The country */
  country: string;

  /** The postal or ZIP code */
  postalCode: string;
}
