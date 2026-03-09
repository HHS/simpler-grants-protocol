import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.PocAddress;

/** A mailing address for the primary point of contact */
@extension("x-tags", #[Tags.contact, Tags.address])
@extension(
  "x-mapping-from-cg",
  #{
    street1: "contacts.primary.addresses.primary.street1",
    street2: "contacts.primary.addresses.primary.street2",
    city: "contacts.primary.addresses.primary.city",
    stateOrProvince: "contacts.primary.addresses.primary.state",
    country: "contacts.primary.addresses.primary.country",
    postalCode: "contacts.primary.addresses.primary.zipPostalCode",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        addresses: #{
          primary: #{
            street1: "street1",
            street2: "street2",
            city: "city",
            stateOrProvince: "stateOrProvince",
            country: "country",
            postalCode: "postalCode",
          },
        },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/street1" },
      #{ type: "Control", scope: "#/properties/street2" },
      #{ type: "Control", scope: "#/properties/city" },
      #{ type: "Control", scope: "#/properties/stateOrProvince" },
      #{ type: "Control", scope: "#/properties/country" },
      #{ type: "Control", scope: "#/properties/postalCode" }
    ],
  }
)
@example(Examples.Address.apartment)
model QuestionPocAddress extends Address {}
