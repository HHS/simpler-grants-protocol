import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.FiscalSponsorDetails;

/** A composite question capturing key details about the fiscal sponsor organization */
@extension("x-tags", #[Tags.group])
@extension("x-entity", #[Entities.fiscalSponsor])
@extension(
  "x-mapping-from-cg",
  #{
    name: #{ field: "organizations.otherOrgs.fiscalSponsor.name" },
    ein: #{ field: "organizations.otherOrgs.fiscalSponsor.ein" },
    uei: #{ field: "organizations.otherOrgs.fiscalSponsor.uei" },
    address: #{
      street1: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.street1" },
      street2: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.street2" },
      city: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.city" },
      state: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.stateOrProvince" },
      country: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.country" },
      postalCode: #{ field: "organizations.otherOrgs.fiscalSponsor.addresses.primary.postalCode" },
    },
    phone: #{
      countryCode: #{ field: "organizations.otherOrgs.fiscalSponsor.phones.primary.countryCode" },
      number: #{ field: "organizations.otherOrgs.fiscalSponsor.phones.primary.number" },
      extension: #{ field: "organizations.otherOrgs.fiscalSponsor.phones.primary.extension" },
      isMobile: #{ field: "organizations.otherOrgs.fiscalSponsor.phones.primary.isMobile" },
    },
    email: #{ field: "organizations.otherOrgs.fiscalSponsor.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      otherOrgs: #{
        fiscalSponsor: #{
          name: #{ field: "name" },
          ein: #{ field: "ein" },
          uei: #{ field: "uei" },
          addresses: #{
            primary: #{
              street1: #{ field: "address.street1" },
              street2: #{ field: "address.street2" },
              city: #{ field: "address.city" },
              stateOrProvince: #{ field: "address.state" },
              country: #{ field: "address.country" },
              postalCode: #{ field: "address.postalCode" },
            },
          },
          phones: #{
            primary: #{
              countryCode: #{ field: "phone.countryCode" },
              number: #{ field: "phone.number" },
              extension: #{ field: "phone.extension" },
              isMobile: #{ field: "phone.isMobile" },
            },
          },
          emails: #{
            primary: #{ field: "email" },
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
    label: "Fiscal Sponsor Details",
    elements: #[
      #{ type: "Control", scope: "#/properties/name", label: "Fiscal Sponsor Legal Name" },
      #{ type: "Control", scope: "#/properties/ein", label: "Fiscal Sponsor EIN" },
      #{ type: "Control", scope: "#/properties/uei", label: "Fiscal Sponsor UEI" },
      #{
        type: "Group",
        label: "Address",
        elements: #[
          #{ type: "Control", scope: "#/properties/address/properties/street1", label: "Street Address (Line 1)" },
          #{ type: "Control", scope: "#/properties/address/properties/street2", label: "Street Address (Line 2)" },
          #{ type: "Control", scope: "#/properties/address/properties/city", label: "City" },
          #{ type: "Control", scope: "#/properties/address/properties/state", label: "State" },
          #{ type: "Control", scope: "#/properties/address/properties/country", label: "Country" },
          #{ type: "Control", scope: "#/properties/address/properties/postalCode", label: "Postal Code" }
        ],
      },
      #{
        type: "Group",
        label: "Phone Number",
        elements: #[
          #{ type: "Control", scope: "#/properties/phone/properties/countryCode", label: "Country Code" },
          #{ type: "Control", scope: "#/properties/phone/properties/number", label: "Phone Number" },
          #{ type: "Control", scope: "#/properties/phone/properties/extension", label: "Extension" },
          #{ type: "Control", scope: "#/properties/phone/properties/isMobile", label: "Is Mobile?" }
        ],
      },
      #{ type: "Control", scope: "#/properties/email", label: "Fiscal Sponsor Email Address" }
    ],
  }
)
model QuestionFiscalSponsorDetails {
  /** The fiscal sponsor's legal name */
  @example("Example Fiscal Sponsor")
  name: string;

  /** The fiscal sponsor's EIN */
  ein?: employerTaxId;

  /** The fiscal sponsor's UEI */
  uei?: samUEI;

  /** The fiscal sponsor's primary address */
  address?: QuestionAddress.QuestionAddress;

  /** The fiscal sponsor's primary phone number */
  phone?: QuestionPhone.QuestionPhone;

  /** The fiscal sponsor's primary email address */
  email?: email;
}
