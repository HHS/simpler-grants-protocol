import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-ein.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.FiscalSponsorEin;

/** The Employer Identification Number (EIN) for the fiscal sponsor */
@extension("x-tags", #[Tags.identifier])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    ein: #{ field: "organizations.otherOrgs.fiscalSponsor.ein" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
          ein: #{ field: "ein" },
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
      #{ type: "Control", scope: "#/properties/ein", label: "Fiscal Sponsor EIN" }
    ],
  }
)
@example(#{ ein: "98-7654321" })
model QuestionFiscalSponsorEin extends QuestionEin.QuestionEin {}
