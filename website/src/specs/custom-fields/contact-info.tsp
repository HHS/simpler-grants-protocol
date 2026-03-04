import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.ContactInfo;

/** Structured contact info; systems with only a text blob can use the description field */
@extension("x-tags", #[Tags.contact, Tags.competition, Tags.communication])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.CompetitionBase])
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
