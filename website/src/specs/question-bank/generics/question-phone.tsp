import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.QuestionPhone;

/** A generic phone number question */
@extension("x-tags", #[Tags.phone])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{ field: "countryCode" },
    number: #{ field: "number" },
    extension: #{ field: "extension" },
    isMobile: #{ field: "isMobile" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    countryCode: #{ field: "countryCode" },
    number: #{ field: "number" },
    extension: #{ field: "extension" },
    isMobile: #{ field: "isMobile" },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Phone Number",
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
model QuestionPhone extends Phone {}
