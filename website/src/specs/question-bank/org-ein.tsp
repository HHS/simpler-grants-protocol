import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgEin;

/** The Employer Identification Number (EIN) for the applicant organization */
@extension(
  "x-mapping-from-cg",
  #{
    ein: "organizations.primary.ein",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        ein: "ein",
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/ein" }
    ],
  }
)
@example(#{ ein: "12-3456789" })
model QuestionOrgEin {
  /** The organization's Employer Identification Number */
  ein: employerTaxId;
}
