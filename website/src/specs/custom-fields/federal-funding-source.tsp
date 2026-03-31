import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingSource;

/** The legislative funding sources for a federal grant opportunity (e.g. discretionary, mandatory) */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingSource extends CustomField {
  name: "federalFundingSource";
  fieldType: CustomFieldType.string;

  @example("discretionary")
  value: string;

  description: "The legislative funding source for a federal grant opportunity (e.g. discretionary, mandatory)";
}
