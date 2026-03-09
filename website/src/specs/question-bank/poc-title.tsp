import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using JsonSchema;

namespace QuestionBank.PocTitle;

/** The job title of the primary point of contact */
@extension("x-tags", #[Tags.contact])
@extension(
  "x-mapping-from-cg",
  #{
    title: "contacts.primary.title",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        title: "title",
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "VerticalLayout",
    elements: #[
      #{ type: "Control", scope: "#/properties/title" }
    ],
  }
)
@example(#{ title: "Chief Executive Officer" })
model QuestionPocTitle {
  /** The contact's job title or role */
  title: string;
}
