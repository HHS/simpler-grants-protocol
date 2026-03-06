import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalOpportunityNumber;

/** The federal opportunity number (e.g., ABC-123-XYZ-001) */
@extension("x-tags", #[Tags.identifier, Tags.federal])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalOpportunityNumber extends CustomField {
  name: "federalOpportunityNumber";
  fieldType: CustomFieldType.string;

  @example("ABC-123-XYZ-001")
  value: string;

  description: "The federal opportunity number assigned to this grant opportunity";
}
