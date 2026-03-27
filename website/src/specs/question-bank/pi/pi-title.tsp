import "@typespec/json-schema";
import "../index.tsp";

using JsonSchema;

namespace QuestionBank.PiTitle;

/** The job title of the principal investigator */
@extension("x-tags", #[Tags.title])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    title: #{ field: "contacts.otherContacts.principalInvestigator.title" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
          title: #{ field: "title" },
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
      #{ type: "Control", scope: "#/properties/title", label: "Job Title" }
    ],
  }
)
@example(#{ title: "Professor of Biology" })
model QuestionPiTitle {
  /** The principal investigator's job title or role */
  title: string;
}
