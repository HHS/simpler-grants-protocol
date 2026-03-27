import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.AorPhone;

/** A phone number for the Authorized Organization Representative (AOR) */
@extension("x-tags", #[Tags.phone])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{
      field: "contacts.otherContacts.authorizedRepresentative.phones.primary.countryCode",
    },
    number: #{
      field: "contacts.otherContacts.authorizedRepresentative.phones.primary.number",
    },
    extension: #{
      field: "contacts.otherContacts.authorizedRepresentative.phones.primary.extension",
    },
    isMobile: #{
      field: "contacts.otherContacts.authorizedRepresentative.phones.primary.isMobile",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{
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
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Authorized Organization Representative Phone Number",
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
model QuestionAorPhone extends QuestionPhone.QuestionPhone {}
