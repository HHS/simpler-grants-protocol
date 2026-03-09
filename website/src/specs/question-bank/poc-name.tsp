import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.PocName;

/** The name of the primary point of contact */
@extension(
  "x-mapping-from-cg",
  #{
    prefix: "contacts.primary.name.prefix",
    firstName: "contacts.primary.name.firstName",
    middleName: "contacts.primary.name.middleName",
    lastName: "contacts.primary.name.lastName",
    suffix: "contacts.primary.name.suffix",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        name: #{
          prefix: "prefix",
          firstName: "firstName",
          middleName: "middleName",
          lastName: "lastName",
          suffix: "suffix",
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
      #{ type: "Control", scope: "#/properties/prefix" },
      #{ type: "Control", scope: "#/properties/firstName" },
      #{ type: "Control", scope: "#/properties/middleName" },
      #{ type: "Control", scope: "#/properties/lastName" },
      #{ type: "Control", scope: "#/properties/suffix" }
    ],
  }
)
@example(Examples.Name.janeDoe)
model QuestionPrimaryContactName extends Name {}
