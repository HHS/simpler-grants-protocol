import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-name.tsp";

using JsonSchema;

namespace QuestionBank.PiName;

/** The name of the principal investigator */
@extension("x-tags", #[Tags.person, Tags.name])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    prefix: #{
      field: "contacts.otherContacts.principalInvestigator.name.prefix",
    },
    firstName: #{
      field: "contacts.otherContacts.principalInvestigator.name.firstName",
    },
    middleName: #{
      field: "contacts.otherContacts.principalInvestigator.name.middleName",
    },
    lastName: #{
      field: "contacts.otherContacts.principalInvestigator.name.lastName",
    },
    suffix: #{
      field: "contacts.otherContacts.principalInvestigator.name.suffix",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
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
    label: "Principal Investigator Name",
    elements: #[
      #{ type: "Control", scope: "#/properties/prefix", label: "Prefix" },
      #{
        type: "Control",
        scope: "#/properties/firstName",
        label: "First Name",
      },
      #{
        type: "Control",
        scope: "#/properties/middleName",
        label: "Middle Name",
      },
      #{ type: "Control", scope: "#/properties/lastName", label: "Last Name" },
      #{ type: "Control", scope: "#/properties/suffix", label: "Suffix" }
    ],
  }
)
@example(#{
  prefix: QuestionName.NamePrefix.Dr,
  firstName: "John",
  lastName: "Smith",
})
model QuestionPiName extends QuestionName.QuestionName {}
