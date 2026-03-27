import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-email.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.PiEmail;

/** The email address of the principal investigator */
@extension("x-tags", #[Tags.email])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    email: #{ field: "contacts.otherContacts.principalInvestigator.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
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
      #{ type: "Control", scope: "#/properties/email", label: "PI Email Address" }
    ],
  }
)
@example(#{ email: "pi@university.edu" })
model QuestionPiEmail extends QuestionEmail.QuestionEmail {}
