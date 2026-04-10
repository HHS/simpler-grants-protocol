import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";

using JsonSchema;

namespace QuestionBank.FiscalSponsorAddress;

/** An address for the fiscal sponsor organization */
@extension("x-tags", #[Tags.organization, Tags.address])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.street1",
    },
    street2: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.street2",
    },
    city: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.city",
    },
    state: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.stateOrProvince",
    },
    country: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.country",
    },
    postalCode: #{
      field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.postalCode",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
          addresses: #{
            primary: #{
              street1: #{ field: "street1" },
              street2: #{ field: "street2" },
              city: #{ field: "city" },
              stateOrProvince: #{ field: "state" },
              country: #{ field: "country" },
              postalCode: #{ field: "postalCode" },
            },
          },
        },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Fiscal Sponsor Address",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/street1",
        label: "Street Address (Line 1)",
      },
      #{
        type: "Control",
        scope: "#/properties/street2",
        label: "Street Address (Line 2)",
      },
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
      #{
        type: "Control",
        scope: "#/properties/postalCode",
        label: "Postal Code",
      }
    ],
  }
)
@example(#{
  street1: "789 Oak Ave",
  city: "Springfield",
  state: QuestionAddress.USState.IL,
  country: "US",
  postalCode: "62701",
})
model QuestionFiscalSponsorAddress extends QuestionAddress.QuestionAddress {}
