import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.QuestionEin;

/** A generic Employer Identification Number (EIN) question */
@extension("x-tags", #[Tags.generic, Tags.identifier])
@extension("x-mapping-from-cg", #{ ein: #{ field: "ein" } })
@extension("x-mapping-to-cg", #{ ein: #{ field: "ein" } })
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/ein",
        label: "Employer Identification Number (EIN)",
      }
    ],
  }
)
@example(#{ ein: "12-3456789" })
model QuestionEin {
  /** Employer Identification Number */
  ein: employerTaxId;
}
