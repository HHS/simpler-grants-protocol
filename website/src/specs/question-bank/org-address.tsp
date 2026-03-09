import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.OrgAddress;

/** An address for an organization */
@extension(
  "x-mapping-from-cg",
  #{
    street1: "organizations.primary.addresses.primary.street1",
    street2: "organizations.primary.addresses.primary.street2",
    city: "organizations.primary.addresses.primary.city",
    stateOrProvince: "organizations.primary.addresses.primary.stateOrProvince",
    country: "organizations.primary.addresses.primary.country",
    postalCode: "organizations.primary.addresses.primary.postalCode",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
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
@example(Examples.Address.orgAddress)
model QuestionPrimaryOrgAddress extends Address {}
