import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.FederalFundingInstruments;

/** Federal funding instrument types (federal-specific; NOFO IC defines 17 types) */
model CustomFederalFundingInstruments extends CustomField {
  name: "federalFundingInstruments";
  fieldType: CustomFieldType.array;

  @example(#["Grant", "Cooperative Agreement"])
  value: string[];

  description: "Funding instrument types for this opportunity (federal-specific extensible set)";
}
