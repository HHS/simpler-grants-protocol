import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-address.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Types;
using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.OrgDetails;

/** A composite question capturing key details about the primary applicant organization */
@extension("x-tags", #[Tags.group])
@extension("x-entity", #[Entities.primaryOrg])
@extension(
  "x-mapping-from-cg",
  #{
    name: #{ field: "organizations.primary.name" },
    ein: #{ field: "organizations.primary.ein" },
    uei: #{ field: "organizations.primary.uei" },
    duns: #{ field: "organizations.primary.duns" },
    mission: #{ field: "organizations.primary.mission" },
    yearFounded: #{ field: "organizations.primary.yearFounded" },
    address: #{
      street1: #{ field: "organizations.primary.addresses.primary.street1" },
      street2: #{ field: "organizations.primary.addresses.primary.street2" },
      city: #{ field: "organizations.primary.addresses.primary.city" },
      state: #{ field: "organizations.primary.addresses.primary.stateOrProvince" },
      country: #{ field: "organizations.primary.addresses.primary.country" },
      postalCode: #{ field: "organizations.primary.addresses.primary.postalCode" },
    },
    phone: #{
      countryCode: #{ field: "organizations.primary.phones.primary.countryCode" },
      number: #{ field: "organizations.primary.phones.primary.number" },
      extension: #{ field: "organizations.primary.phones.primary.extension" },
      isMobile: #{ field: "organizations.primary.phones.primary.isMobile" },
    },
    email: #{ field: "organizations.primary.emails.primary" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    organizations: #{
      primary: #{
        name: #{ field: "name" },
        ein: #{ field: "ein" },
        uei: #{ field: "uei" },
        duns: #{ field: "duns" },
        mission: #{ field: "mission" },
        yearFounded: #{ field: "yearFounded" },
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
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Primary Applicant Organization Details",
    elements: #[
      #{ type: "Control", scope: "#/properties/name", label: "Organization Legal Name" },
      #{ type: "Control", scope: "#/properties/ein", label: "Employer Identification Number (EIN)" },
      #{ type: "Control", scope: "#/properties/uei", label: "Unique Entity Identifier (UEI)" },
      #{ type: "Control", scope: "#/properties/duns", label: "DUNS Number" },
      #{ type: "Control", scope: "#/properties/mission", label: "Mission Statement" },
      #{ type: "Control", scope: "#/properties/yearFounded", label: "Year Founded" },
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
      #{ type: "Control", scope: "#/properties/email", label: "Organization Email Address" }
    ],
  }
)
model QuestionOrgDetails {
  /** The organization's legal name */
  @example("Example Organization")
  name: string;

  /** The organization's Employer Identification Number */
  ein?: employerTaxId;

  /** The organization's Unique Entity Identifier from SAM.gov */
  uei?: samUEI;

  /** The organization's DUNS number */
  duns?: duns;

  /** The organization's mission statement */
  @example("To advance scientific research and education.")
  mission?: string;

  /** The calendar year the organization was founded */
  yearFounded?: calendarYear;

  /** The organization's primary address */
  address?: QuestionAddress.QuestionAddress;

  /** The organization's primary phone number */
  phone?: QuestionPhone.QuestionPhone;

  /** The organization's primary email address */
  email?: email;
}
