import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingSource;

/** The set of known federal funding source types */
enum FederalFundingSourceOptions {
  discretionary,
  mandatory,
  continuation,
  earmark,
  custom,
}

/** The funding source for a federal grant opportunity (e.g. discretionary, mandatory, earmark) */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingSource extends CustomField {
  name: "federalFundingSource";
  fieldType: CustomFieldType.object;

  @example(#{
    type: FederalFundingSourceOptions.discretionary,
    description: "Discretionary funding allocated by Congress",
  })
  value: {
    /** The funding source type, from a predefined set of options */
    type: FederalFundingSourceOptions;

    /** A custom type when type is 'custom' */
    customType?: string;

    /** A human-readable description of the funding source */
    description?: string;
  };

  description: "The funding source for a federal grant opportunity (e.g. discretionary, mandatory, earmark, continuation)";
}
