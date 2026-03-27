import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";

using JsonSchema;

namespace QuestionBank.AorAddress;

/** A mailing address for the Authorized Organization Representative (AOR) */
@extension("x-tags", #[Tags.person, Tags.address])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.street1",
    },
    street2: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.street2",
    },
    city: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.city",
    },
    state: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.stateOrProvince",
    },
    country: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.country",
    },
    postalCode: #{
      field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.postalCode",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{
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
    label: "Authorized Organization Representative Address",
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
  street1: "200 Federal Plaza",
  city: "Washington",
  state: QuestionAddress.USState.DC,
  country: "US",
  postalCode: "20001",
})
model QuestionAorAddress extends QuestionAddress.QuestionAddress {}
