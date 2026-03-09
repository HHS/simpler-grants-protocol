import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.PocPhone;

/** A phone number for the primary point of contact */
@extension("x-tags", #[Tags.contact, Tags.phone])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: "contacts.primary.phones.primary.countryCode",
    number: "contacts.primary.phones.primary.number",
    extension: "contacts.primary.phones.primary.extension",
    isMobile: "contacts.primary.phones.primary.isMobile",
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        phones: #{
          primary: #{
            countryCode: "countryCode",
            number: "number",
            extension: "extension",
            isMobile: "isMobile",
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
      #{ type: "Control", scope: "#/properties/countryCode" },
      #{ type: "Control", scope: "#/properties/number" },
      #{ type: "Control", scope: "#/properties/extension" },
      #{ type: "Control", scope: "#/properties/isMobile" }
    ],
  }
)
@example(Examples.Phone.mobile)
model QuestionPocPhone extends Phone {}
