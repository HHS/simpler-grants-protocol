import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgName;

/** The legal name of the applicant organization */
@extension("x-tags", #[Tags.name])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    name: #{ field: "organizations.primary.name" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        name: #{ field: "name" },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/name", label: "Organization Legal Name" }
    ],
  }
)
@example(#{ name: "Example Organization" })
model QuestionOrgName {
  /** The organization's legal name */
  name: string;
}
