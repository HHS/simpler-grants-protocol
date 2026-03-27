import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-email.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.AorEmail;

/** The email address of the Authorized Organization Representative (AOR) */
@extension("x-tags", #[Tags.email])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    email: #{ field: "contacts.otherContacts.authorizedRepresentative.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{
          emails: #{
            primary: #{ field: "email" },
          },
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
      #{ type: "Control", scope: "#/properties/email", label: "AOR Email Address" }
    ],
  }
)
@example(#{ email: "aor@example.org" })
model QuestionAorEmail extends QuestionEmail.QuestionEmail {}
