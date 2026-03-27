import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.FiscalSponsorName;

/** The legal name of the fiscal sponsor organization */
@extension("x-tags", #[Tags.organization, Tags.name])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{ name: #{ field: "organizations.otherOrgs.fiscalSponsor.name" } }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{ fiscalSponsor: #{ name: #{ field: "name" } } },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/name",
        label: "Fiscal Sponsor Legal Name",
      }
    ],
  }
)
@example(#{ name: "Example Fiscal Sponsor" })
model QuestionFiscalSponsorName {
  /** The fiscal sponsor's legal name */
  name: string;
}
