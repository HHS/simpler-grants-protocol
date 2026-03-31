import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgUei;

/** The Unique Entity Identifier (UEI) for the applicant organization */
@extension("x-tags", #[Tags.organization, Tags.identifier])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{ uei: #{ field: "organizations.primary.uei" } }
)
@extension(
  "x-mapping-to-cg",
  #{ organizations: #{ primary: #{ uei: #{ field: "uei" } } } }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/uei",
        label: "Unique Entity Identifier (UEI)",
      }
    ],
  }
)
@example(#{ uei: "AB1234567890" })
model QuestionOrgUei {
  /** The organization's Unique Entity Identifier from SAM.gov */
  uei: samUEI;
}
