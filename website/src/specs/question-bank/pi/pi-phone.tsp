import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.PiPhone;

/** A phone number for the principal investigator */
@extension("x-tags", #[Tags.phone])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{ field: "contacts.otherContacts.principalInvestigator.phones.primary.countryCode" },
    number: #{ field: "contacts.otherContacts.principalInvestigator.phones.primary.number" },
    extension: #{ field: "contacts.otherContacts.principalInvestigator.phones.primary.extension" },
    isMobile: #{ field: "contacts.otherContacts.principalInvestigator.phones.primary.isMobile" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
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
    label: "Principal Investigator Phone Number",
    elements: #[
      #{ type: "Control", scope: "#/properties/countryCode", label: "Country Code" },
      #{ type: "Control", scope: "#/properties/number", label: "Phone Number" },
      #{ type: "Control", scope: "#/properties/extension", label: "Extension" },
      #{ type: "Control", scope: "#/properties/isMobile", label: "Is Mobile?" }
    ],
  }
)
@example(Examples.Phone.mobile)
model QuestionPiPhone extends QuestionPhone.QuestionPhone {}
