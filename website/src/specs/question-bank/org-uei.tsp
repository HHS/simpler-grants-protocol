import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgUei;

/** The Unique Entity Identifier (UEI) for the applicant organization */
@extension("x-tags", #[Tags.organization, Tags.identifier])
@extension(
  "x-mapping-from-cg",
  #{
    uei: "organizations.primary.uei",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        uei: "uei",
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/uei" }
    ],
  }
)
@example(#{ uei: "ABC1234567890" })
model QuestionOrgUei {
  /** The organization's Unique Entity Identifier from SAM.gov */
  uei: samUEI;
}
