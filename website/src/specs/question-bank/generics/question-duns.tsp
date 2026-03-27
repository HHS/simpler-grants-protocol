import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.QuestionDuns;

/** A generic DUNS number question */
@extension("x-tags", #[Tags.generic, Tags.identifier])
@extension("x-mapping-from-cg", #{ duns: #{ field: "duns" } })
@extension("x-mapping-to-cg", #{ duns: #{ field: "duns" } })
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
model QuestionDuns {
  /** Data Universal Numbering System (DUNS) number */
  duns: duns;
}
