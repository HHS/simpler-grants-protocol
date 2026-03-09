import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.OrgPhone;

/** A phone number for the applicant organization */
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: "organizations.primary.phones.primary.countryCode",
    number: "organizations.primary.phones.primary.number",
    extension: "organizations.primary.phones.primary.extension",
    isMobile: "organizations.primary.phones.primary.isMobile",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        phones: #{
          primary: #{
            countryCode: "countryCode",
            number: "number",
            extension: "extension",
            isMobile: "isMobile",
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
      #{ type: "Control", scope: "#/properties/countryCode" },
      #{ type: "Control", scope: "#/properties/number" },
      #{ type: "Control", scope: "#/properties/extension" },
      #{ type: "Control", scope: "#/properties/isMobile" }
    ],
  }
)
@example(Examples.Phone.mobile)
model QuestionOrgPhone extends Phone {}
