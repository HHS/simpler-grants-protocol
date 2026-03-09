import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgName;

/** The legal name of the applicant organization */
@extension("x-tags", #[Tags.organization, Tags.name])
@extension(
  "x-mapping-from-cg",
  #{
    name: "organizations.primary.name",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        name: "name",
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/name" }
    ],
  }
)
@example(#{ name: "Example Organization" })
model QuestionOrgName {
  /** The organization's legal name */
  name: string;
}
