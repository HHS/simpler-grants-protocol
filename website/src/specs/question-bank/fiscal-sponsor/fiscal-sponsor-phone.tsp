import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.FiscalSponsorPhone;

/** A phone number for the fiscal sponsor organization */
@extension("x-tags", #[Tags.organization, Tags.phone])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    countryCode: #{
      field: "organizations.otherOrgs.fiscalSponsor.phones.primary.countryCode",
    },
    number: #{
      field: "organizations.otherOrgs.fiscalSponsor.phones.primary.number",
    },
    extension: #{
      field: "organizations.otherOrgs.fiscalSponsor.phones.primary.extension",
    },
    isMobile: #{
      field: "organizations.otherOrgs.fiscalSponsor.phones.primary.isMobile",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
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
    label: "Fiscal Sponsor Phone Number",
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
model QuestionFiscalSponsorPhone extends QuestionPhone.QuestionPhone {}
