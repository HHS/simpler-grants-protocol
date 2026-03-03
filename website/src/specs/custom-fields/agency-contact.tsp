import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.AgencyContact;

/** Agency contact information */
model CustomAgencyContact extends CustomField {
  name: "agencyContact";
  fieldType: CustomFieldType.object;

  @example(#{
    description: "For more information, reach out to Jane Smith at agency US-ABC",
    emailAddress: "fake_email@grants.gov",
    emailDescription: "Click me to email the agency",
  })
  value: {
    description?: string;
    emailAddress?: string;
    emailDescription?: string;
  };

  description: "Contact information for the agency managing this opportunity";
}
