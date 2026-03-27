import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-uei.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.FiscalSponsorUei;

/** The Unique Entity Identifier (UEI) for the fiscal sponsor */
@extension("x-tags", #[Tags.identifier])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    uei: #{ field: "organizations.otherOrgs.fiscalSponsor.uei" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
          uei: #{ field: "uei" },
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
      #{ type: "Control", scope: "#/properties/uei", label: "Fiscal Sponsor UEI" }
    ],
  }
)
@example(#{ uei: "XYZ9876543210" })
model QuestionFiscalSponsorUei extends QuestionUei.QuestionUei {}
