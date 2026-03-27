import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-email.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.FiscalSponsorEmail;

/** The email address of the fiscal sponsor organization */
@extension("x-tags", #[Tags.email])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    email: #{ field: "organizations.otherOrgs.fiscalSponsor.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
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
      #{ type: "Control", scope: "#/properties/email", label: "Fiscal Sponsor Email Address" }
    ],
  }
)
@example(#{ email: "fiscal@example.org" })
model QuestionFiscalSponsorEmail extends QuestionEmail.QuestionEmail {}
