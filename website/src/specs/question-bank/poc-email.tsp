import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.PocEmail;

/** The email address of the primary point of contact */
@extension("x-tags", #[Tags.contact, Tags.email])
@extension(
  "x-mapping-from-cg",
  #{
    email: "contacts.primary.emails.primary",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        emails: #{
          primary: "email",
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
      #{ type: "Control", scope: "#/properties/email" }
    ],
  }
)
@example(#{ email: "jane.doe@example.com" })
model QuestionPocEmail {
  /** The contact's primary email address */
  email: email;
}
