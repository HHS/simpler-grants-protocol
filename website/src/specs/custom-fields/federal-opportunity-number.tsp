import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.FederalOpportunityNumber;

/** The federal opportunity number (e.g., ABC-123-XYZ-001) */
model CustomFederalOpportunityNumber extends CustomField {
  name: "federalOpportunityNumber";
  fieldType: CustomFieldType.string;

  @example("ABC-123-XYZ-001")
  value: string;

  description: "The federal opportunity number assigned to this grant opportunity";
}
