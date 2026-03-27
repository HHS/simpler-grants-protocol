import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingSources;

/** The set of known federal funding source types */
enum FederalFundingSourceOptions {
  discretionary,
  mandatory,
  continuation,
  earmark,
  custom,
}

/** The legislative funding sources for a federal grant opportunity (e.g. discretionary, mandatory) */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingSources extends CustomField {
  name: "federalFundingSources";
  fieldType: CustomFieldType.array;

  @example(#[
    #{ type: FederalFundingSourceOptions.discretionary },
    #{ type: FederalFundingSourceOptions.mandatory }
  ])
  value: Array<{
    /** The funding source type, from a predefined set of options */
    type: FederalFundingSourceOptions;

    /** A custom value when type is 'custom' */
    customValue?: string;
  }>;

  description: "The legislative funding sources for a federal grant opportunity (e.g. discretionary, mandatory)";
}
