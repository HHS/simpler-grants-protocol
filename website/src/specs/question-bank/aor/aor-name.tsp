import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-name.tsp";

using JsonSchema;

namespace QuestionBank.AorName;

/** The name of the Authorized Organization Representative (AOR) */
@extension("x-tags", #[Tags.name])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    prefix: #{ field: "contacts.otherContacts.authorizedRepresentative.name.prefix" },
    firstName: #{ field: "contacts.otherContacts.authorizedRepresentative.name.firstName" },
    middleName: #{ field: "contacts.otherContacts.authorizedRepresentative.name.middleName" },
    lastName: #{ field: "contacts.otherContacts.authorizedRepresentative.name.lastName" },
    suffix: #{ field: "contacts.otherContacts.authorizedRepresentative.name.suffix" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{
          name: #{
            prefix: #{ field: "prefix" },
            firstName: #{ field: "firstName" },
            middleName: #{ field: "middleName" },
            lastName: #{ field: "lastName" },
            suffix: #{ field: "suffix" },
          },
        },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Authorized Organization Representative Name",
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
  firstName: "Sarah",
  lastName: "Johnson",
})
model QuestionAorName extends QuestionName.QuestionName {}
