import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-name.tsp";
import "../generics/question-address.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.PiDetails;

/** A composite question capturing key details about the principal investigator */
@extension("x-tags", #[Tags.group])
@extension("x-entity", #[Entities.principalInvestigator])
@extension(
  "x-mapping-from-cg",
  #{
    name: #{
      prefix: #{
        field: "contacts.otherContacts.principalInvestigator.name.prefix",
      },
      firstName: #{
        field: "contacts.otherContacts.principalInvestigator.name.firstName",
      },
      middleName: #{
        field: "contacts.otherContacts.principalInvestigator.name.middleName",
      },
      lastName: #{
        field: "contacts.otherContacts.principalInvestigator.name.lastName",
      },
      suffix: #{
        field: "contacts.otherContacts.principalInvestigator.name.suffix",
      },
    },
    title: #{ field: "contacts.otherContacts.principalInvestigator.title" },
    address: #{
      street1: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.street1",
      },
      street2: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.street2",
      },
      city: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.city",
      },
      state: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.stateOrProvince",
      },
      country: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.country",
      },
      postalCode: #{
        field: "contacts.otherContacts.principalInvestigator.addresses.primary.postalCode",
      },
    },
    phone: #{
      countryCode: #{
        field: "contacts.otherContacts.principalInvestigator.phones.primary.countryCode",
      },
      number: #{
        field: "contacts.otherContacts.principalInvestigator.phones.primary.number",
      },
      extension: #{
        field: "contacts.otherContacts.principalInvestigator.phones.primary.extension",
      },
      isMobile: #{
        field: "contacts.otherContacts.principalInvestigator.phones.primary.isMobile",
      },
    },
    email: #{
      field: "contacts.otherContacts.principalInvestigator.emails.primary",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        principalInvestigator: #{
          name: #{
            prefix: #{ field: "name.prefix" },
            firstName: #{ field: "name.firstName" },
            middleName: #{ field: "name.middleName" },
            lastName: #{ field: "name.lastName" },
            suffix: #{ field: "name.suffix" },
          },
          title: #{ field: "title" },
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
          emails: #{ primary: #{ field: "email" } },
        },
      },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Principal Investigator Details",
    elements: #[
      #{
        type: "Group",
        label: "Name",
        elements: #[
          #{
            type: "Control",
            scope: "#/properties/name/properties/prefix",
            label: "Prefix",
          },
          #{
            type: "Control",
            scope: "#/properties/name/properties/firstName",
            label: "First Name",
          },
          #{
            type: "Control",
            scope: "#/properties/name/properties/middleName",
            label: "Middle Name",
          },
          #{
            type: "Control",
            scope: "#/properties/name/properties/lastName",
            label: "Last Name",
          },
          #{
            type: "Control",
            scope: "#/properties/name/properties/suffix",
            label: "Suffix",
          }
        ],
      },
      #{ type: "Control", scope: "#/properties/title", label: "Job Title" },
      #{
        type: "Group",
        label: "Mailing Address",
        elements: #[
          #{
            type: "Control",
            scope: "#/properties/address/properties/street1",
            label: "Street Address (Line 1)",
          },
          #{
            type: "Control",
            scope: "#/properties/address/properties/street2",
            label: "Street Address (Line 2)",
          },
          #{
            type: "Control",
            scope: "#/properties/address/properties/city",
            label: "City",
          },
          #{
            type: "Control",
            scope: "#/properties/address/properties/state",
            label: "State",
          },
          #{
            type: "Control",
            scope: "#/properties/address/properties/country",
            label: "Country",
          },
          #{
            type: "Control",
            scope: "#/properties/address/properties/postalCode",
            label: "Postal Code",
          }
        ],
      },
      #{
        type: "Group",
        label: "Phone Number",
        elements: #[
          #{
            type: "Control",
            scope: "#/properties/phone/properties/countryCode",
            label: "Country Code",
          },
          #{
            type: "Control",
            scope: "#/properties/phone/properties/number",
            label: "Phone Number",
          },
          #{
            type: "Control",
            scope: "#/properties/phone/properties/extension",
            label: "Extension",
          },
          #{
            type: "Control",
            scope: "#/properties/phone/properties/isMobile",
            label: "Is Mobile?",
          }
        ],
      },
      #{ type: "Control", scope: "#/properties/email", label: "Email Address" }
    ],
  }
)
model QuestionPiDetails {
  /** The PI's full name */
  name: QuestionName.QuestionName;

  /** The PI's job title or role */
  @example("Professor of Biology")
  title?: string;

  /** The PI's mailing address */
  address?: QuestionAddress.QuestionAddress;

  /** The PI's phone number */
  phone?: QuestionPhone.QuestionPhone;

  /** The PI's email address */
  email?: email;
}
