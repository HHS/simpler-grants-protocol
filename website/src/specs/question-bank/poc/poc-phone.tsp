import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.PocPhone;

/** A phone number for the primary point of contact */
@extension("x-tags", #[Tags.phone])
@extension("x-entity", #[Entities.poc])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{ field: "contacts.primary.phones.primary.countryCode" },
    number: #{ field: "contacts.primary.phones.primary.number" },
    extension: #{ field: "contacts.primary.phones.primary.extension" },
    isMobile: #{ field: "contacts.primary.phones.primary.isMobile" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      primary: #{
        phones: #{
          primary: #{
            countryCode: #{ field: "countryCode" },
            number: #{ field: "number" },
            extension: #{ field: "extension" },
            isMobile: #{ field: "isMobile" },
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
    label: "Primary Point of Contact Phone Number",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/countryCode",
        label: "Country Code",
      },
      #{
        type: "Control",
        scope: "#/properties/number",
        label: "Phone Number",
      },
      #{
        type: "Control",
        scope: "#/properties/extension",
        label: "Extension",
      },
      #{ type: "Control", scope: "#/properties/isMobile", label: "Is Mobile?" }
    ],
  }
)
@example(Examples.Phone.mobile)
model QuestionPocPhone extends Phone {}
