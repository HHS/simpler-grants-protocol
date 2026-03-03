import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.ContactInfo;

/** Structured contact info; systems with only a text blob can use the description field */
model CustomContactInfo extends CustomField {
  name: "contactInfo";
  fieldType: CustomFieldType.object;

  @example(#{
    name: "Jane Smith",
    email: "jane.smith@agency.gov",
    phone: "+1-202-555-0100",
    description: "Program officer for technical questions",
  })
  value: {
    name?: string;
    email?: string;
    phone?: string;
    /** Plain-text fallback when structured fields are not available */
    description?: string;
  };

  description: "Contact information (name, email, phone, description) for the competition or opportunity";
}
