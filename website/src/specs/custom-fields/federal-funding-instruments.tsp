import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingInstruments;

/** Federal funding instrument types for this opportunity */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingInstruments extends CustomField {
  name: "federalFundingInstruments";
  fieldType: CustomFieldType.array;

<<<<<<< 591-update-question-bank
  @example(#[
    #{ type: FederalFundingInstrumentOptions.grant },
    #{ type: FederalFundingInstrumentOptions.cooperativeAgreement }
  ])
  value: Array<{
    /** The funding instrument type, from a predefined set of options */
    type: FederalFundingInstrumentOptions;

    /** A custom value when type is 'custom' */
    customValue?: string;
  }>;
=======
  @example(#["grant", "cooperativeAgreement"])
  value: Array<string>;
>>>>>>> main

  description: "Federal funding instrument types for this opportunity";
}
