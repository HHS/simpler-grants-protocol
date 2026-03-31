import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.PocEmail;

/** The email address of the primary point of contact */
@extension("x-tags", #[Tags.person, Tags.email])
@extension("x-entity", #[Entities.poc])
@extension(
  "x-mapping-from-cg",
  #{ email: #{ field: "contacts.primary.emails.primary" } }
)
@extension(
  "x-mapping-to-cg",
  #{ contacts: #{ primary: #{ emails: #{ primary: #{ field: "email" } } } } }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/email", label: "Email Address" }
    ],
  }
)
@example(#{ email: "jane.doe@example.com" })
model QuestionPocEmail {
  /** The contact's primary email address */
  email: email;
}
