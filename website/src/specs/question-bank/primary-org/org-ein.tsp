import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgEin;

/** The Employer Identification Number (EIN) for the applicant organization */
@extension("x-tags", #[Tags.identifier])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    ein: #{ field: "organizations.primary.ein" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        ein: #{ field: "ein" },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/ein", label: "Employer Identification Number (EIN)" }
    ],
  }
)
@example(#{ ein: "12-3456789" })
model QuestionOrgEin {
  /** The organization's Employer Identification Number */
  ein: employerTaxId;
}
