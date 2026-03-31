import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.QuestionUei;

/** A generic Unique Entity Identifier (UEI) question */
@extension("x-tags", #[Tags.generic, Tags.identifier])
@extension("x-mapping-from-cg", #{ uei: #{ field: "uei" } })
@extension("x-mapping-to-cg", #{ uei: #{ field: "uei" } })
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
model QuestionUei {
  /** SAM.gov Unique Entity Identifier */
  uei: samUEI;
}
