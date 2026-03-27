import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.OrgPhone;

/** A phone number for the applicant organization */
@extension("x-tags", #[Tags.phone])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{ field: "organizations.primary.phones.primary.countryCode" },
    number: #{ field: "organizations.primary.phones.primary.number" },
    extension: #{ field: "organizations.primary.phones.primary.extension" },
    isMobile: #{ field: "organizations.primary.phones.primary.isMobile" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        phones: #{
          primary: #{
            countryCode: #{ field: "countryCode" },
            number: #{ field: "number" },
            extension: #{ field: "extension" },
            isMobile: #{ field: "isMobile" },
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
    label: "Applicant Organization Phone Number",
    elements: #[
      #{ type: "Control", scope: "#/properties/countryCode", label: "Country Code" },
      #{ type: "Control", scope: "#/properties/number", label: "Phone Number" },
      #{ type: "Control", scope: "#/properties/extension", label: "Extension" },
      #{ type: "Control", scope: "#/properties/isMobile", label: "Is Mobile?" }
    ],
  }
)
@example(Examples.Phone.mobile)
model QuestionOrgPhone extends Phone {}
