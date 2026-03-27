import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.OrgEmail;

/** The email address of the applicant organization */
@extension("x-tags", #[Tags.email])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    email: #{ field: "organizations.primary.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        emails: #{
          primary: #{ field: "email" },
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
      #{ type: "Control", scope: "#/properties/email", label: "Organization Email Address" }
    ],
  }
)
@example(#{ email: "info@example.org" })
model QuestionOrgEmail {
  /** The organization's primary email address */
  email: email;
}
