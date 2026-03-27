import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";
import "../generics/question-name.tsp";
import "../generics/question-address.tsp";
import "../generics/question-phone.tsp";

using CommonGrants.Types;
using JsonSchema;

namespace QuestionBank.AorDetails;

/** A composite question capturing key details about the Authorized Organization Representative */
@extension("x-tags", #[Tags.group])
@extension("x-entity", #[Entities.authorizedRepresentative])
@extension(
  "x-mapping-from-cg",
  #{
    name: #{
      prefix: #{
        field: "contacts.otherContacts.authorizedRepresentative.name.prefix",
      },
      firstName: #{
        field: "contacts.otherContacts.authorizedRepresentative.name.firstName",
      },
      middleName: #{
        field: "contacts.otherContacts.authorizedRepresentative.name.middleName",
      },
      lastName: #{
        field: "contacts.otherContacts.authorizedRepresentative.name.lastName",
      },
      suffix: #{
        field: "contacts.otherContacts.authorizedRepresentative.name.suffix",
      },
    },
    title: #{ field: "contacts.otherContacts.authorizedRepresentative.title" },
    address: #{
      street1: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.street1",
      },
      street2: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.street2",
      },
      city: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.city",
      },
      state: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.stateOrProvince",
      },
      country: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.country",
      },
      postalCode: #{
        field: "contacts.otherContacts.authorizedRepresentative.addresses.primary.postalCode",
      },
    },
    phone: #{
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
    },
    email: #{
      field: "contacts.otherContacts.authorizedRepresentative.emails.primary",
    },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    contacts: #{
      otherContacts: #{
        authorizedRepresentative: #{
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
    label: "Authorized Organization Representative Details",
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
model QuestionAorDetails {
  /** The AOR's full name */
  name: QuestionName.QuestionName;

  /** The AOR's job title or role */
  @example("Grants Administrator")
  title?: string;

  /** The AOR's mailing address */
  address?: QuestionAddress.QuestionAddress;

  /** The AOR's phone number */
  phone?: QuestionPhone.QuestionPhone;

  /** The AOR's email address */
  email?: email;
}
