import "@typespec/json-schema";
import "../index.tsp";

using JsonSchema;

namespace QuestionBank.AorTitle;

/** The job title of the Authorized Organization Representative (AOR) */
@extension("x-tags", #[Tags.person, Tags.title])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    title: #{ field: "contacts.otherContacts.authorizedRepresentative.title" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{ title: #{ field: "title" } },
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
@example(#{ title: "Grants Administrator" })
model QuestionAorTitle {
  /** The AOR's job title or role */
  title: string;
}
