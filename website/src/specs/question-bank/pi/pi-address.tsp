import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";

using JsonSchema;

namespace QuestionBank.PiAddress;

/** A mailing address for the principal investigator */
@extension("x-tags", #[Tags.address])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.street1" },
    street2: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.street2" },
    city: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.city" },
    state: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.stateOrProvince" },
    country: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.country" },
    postalCode: #{ field: "contacts.otherContacts.principalInvestigator.addresses.primary.postalCode" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
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
    label: "Principal Investigator Address",
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
  street1: "100 University Blvd",
  city: "Cambridge",
  state: QuestionAddress.USState.MA,
  country: "US",
  postalCode: "02139",
})
model QuestionPiAddress extends QuestionAddress.QuestionAddress {}
