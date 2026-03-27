import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.QuestionEmail;

/** A generic email address question */
@extension("x-tags", #[Tags.generic, Tags.email])
@extension("x-mapping-from-cg", #{ email: #{ field: "email" } })
@extension("x-mapping-to-cg", #{ email: #{ field: "email" } })
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/email", label: "Email Address" }
    ],
  }
)
@example(#{ email: "contact@example.com" })
model QuestionEmail {
  /** Email address */
  email: email;
}
