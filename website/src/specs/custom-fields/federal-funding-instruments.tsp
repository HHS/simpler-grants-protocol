import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingInstruments;

/** Federal funding instrument types (federal-specific; NOFO IC defines 17 types) */
@extension("x-tags", #[Tags.funding, Tags.federal, Tags.instruments])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingInstruments extends CustomField {
  name: "federalFundingInstruments";
  fieldType: CustomFieldType.array;

  @example(#["Grant", "Cooperative Agreement"])
  value: string[];

  description: "Funding instrument types for this opportunity (federal-specific extensible set)";
}
