import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgDuns;

/** The DUNS number for the applicant organization */
@extension("x-tags", #[Tags.identifier])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    duns: #{ field: "organizations.primary.duns" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        duns: #{ field: "duns" },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/duns", label: "DUNS Number" }
    ],
  }
)
@example(#{ duns: "123456789" })
model QuestionOrgDuns {
  /** The organization's Data Universal Numbering System (DUNS) number */
  duns: duns;
}
