import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FederalFundingInstruments;

/** The set of known federal funding instrument types */
enum FederalFundingInstrumentOptions {
  grant,
  cooperativeAgreement,
  procurementContract,
  custom,
}

/** Federal funding instrument types (federal-specific; NOFO IC defines 17 types) */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFederalFundingInstruments extends CustomField {
  name: "federalFundingInstruments";
  fieldType: CustomFieldType.array;

  @example(#[
    #{
      type: FederalFundingInstrumentOptions.grant,
      description: "Grant funding",
    },
    #{
      type: FederalFundingInstrumentOptions.cooperativeAgreement,
      description: "Cooperative agreement funding",
    }
  ])
  value: Array<{
    /** The funding instrument type, from a predefined set of options */
    type: FederalFundingInstrumentOptions;

    /** A custom type when type is 'custom' */
    customType?: string;

    /** A human-readable description of the funding instrument */
    description?: string;
  }>;

  description: "Funding instrument types for this opportunity (federal-specific extensible set)";
}
