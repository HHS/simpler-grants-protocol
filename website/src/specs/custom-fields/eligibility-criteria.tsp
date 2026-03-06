import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.EligibilityCriteria;

/** Eligibility criteria including beneficiary types and free-text details */
@extension("x-tags", #[Tags.context])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomEligibilityCriteria extends CustomField {
  name: "eligibilityCriteria";
  fieldType: CustomFieldType.object;

  @example(#{
    beneficiaryTypes: #[
      #{ code: "EL020000", name: "Youth" },
      #{ code: "EL050000", name: "Veterans" },
    ],
    details: "Applicants must serve communities in rural areas with populations under 50,000.",
  })
  value: {
    /** The types of individuals or groups intended to benefit from the funded activity; codes may reference Candid's PCS population taxonomy */
    beneficiaryTypes?: Array<{
      /** A code identifying the beneficiary type (e.g. a PCS population code) */
      code?: string;

      /** A human-readable name for the beneficiary type */
      name?: string;
    }>;

    /** Free-text description of additional eligibility requirements or criteria */
    details?: string;
  };

  description: "Eligibility criteria for the opportunity, including intended beneficiary types and additional requirements";
}
