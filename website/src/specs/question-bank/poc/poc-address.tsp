import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";

using JsonSchema;

namespace QuestionBank.PocAddress;

/** A mailing address for the primary point of contact */
@extension("x-tags", #[Tags.person, Tags.address])
@extension("x-entity", #[Entities.poc])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{ field: "contacts.primary.addresses.primary.street1" },
    street2: #{ field: "contacts.primary.addresses.primary.street2" },
    city: #{ field: "contacts.primary.addresses.primary.city" },
    state: #{ field: "contacts.primary.addresses.primary.state" },
    country: #{ field: "contacts.primary.addresses.primary.country" },
    postalCode: #{ field: "contacts.primary.addresses.primary.zipPostalCode" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
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
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Primary Point of Contact Mailing Address",
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
  street1: "123 Main St",
  city: "Anytown",
  state: QuestionAddress.USState.CA,
  country: "US",
  postalCode: "12345",
})
model QuestionPocAddress extends QuestionAddress.QuestionAddress {}
