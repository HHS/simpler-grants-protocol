import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";

using JsonSchema;

namespace QuestionBank.OrgAddress;

/** An address for an organization */
@extension("x-tags", #[Tags.address])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    street1: #{ field: "organizations.primary.addresses.primary.street1" },
    street2: #{ field: "organizations.primary.addresses.primary.street2" },
    city: #{ field: "organizations.primary.addresses.primary.city" },
    state: #{ field: "organizations.primary.addresses.primary.stateOrProvince" },
    country: #{ field: "organizations.primary.addresses.primary.country" },
    postalCode: #{ field: "organizations.primary.addresses.primary.postalCode" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
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
    label: "Primary Applicant Organization Address",
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
  state: QuestionAddress.USState.CA,
  country: "US",
  postalCode: "12345",
})
model QuestionPrimaryOrgAddress extends QuestionAddress.QuestionAddress {}
