import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.AgencyContact;

/** Agency contact information */
@extension("x-tags", #[Tags.contact, Tags.agency, Tags.communication])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
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
