import "@typespec/json-schema";
import "./index.tsp";
import "./question-name.tsp";

using JsonSchema;

namespace QuestionBank.PocName;

/** The name of the primary point of contact */
@extension("x-tags", #[Tags.contact, Tags.name])
@extension(
  "x-mapping-from-cg",
  #{
    prefix: #{ field: "contacts.primary.name.prefix" },
    firstName: #{ field: "contacts.primary.name.firstName" },
    middleName: #{ field: "contacts.primary.name.middleName" },
    lastName: #{ field: "contacts.primary.name.lastName" },
    suffix: #{ field: "contacts.primary.name.suffix" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        name: #{
          prefix: #{ field: "prefix" },
          firstName: #{ field: "firstName" },
          middleName: #{ field: "middleName" },
          lastName: #{ field: "lastName" },
          suffix: #{ field: "suffix" },
        },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Primary Point of Contact Name",
    elements: #[
      #{ type: "Control", scope: "#/properties/prefix", label: "Prefix" },
      #{ type: "Control", scope: "#/properties/firstName", label: "First Name" },
      #{ type: "Control", scope: "#/properties/middleName", label: "Middle Name" },
      #{ type: "Control", scope: "#/properties/lastName", label: "Last Name" },
      #{ type: "Control", scope: "#/properties/suffix", label: "Suffix" }
    ],
  }
)
@example(#{
  prefix: QuestionName.NamePrefix.Dr,
  firstName: "Jane",
  middleName: "Edward",
  lastName: "Doe",
  suffix: QuestionName.NameSuffix.Jr,
})
model QuestionPrimaryContactName extends QuestionName.QuestionName {}
