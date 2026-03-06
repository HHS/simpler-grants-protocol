import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.CostSharing;

/** Cost sharing or matching requirement */
@extension("x-tags", #[Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomCostSharing extends CustomField {
  name: "costSharing";
  fieldType: CustomFieldType.object;

  @example(#{
    isRequired: true,
    percentage: 25.0,
    details: "Recipients must provide 25% matching funds. Waiver may be requested for equipment-only projects.",
  })
  value: {
    /** Whether cost sharing or matching funds are required */
    isRequired?: boolean;

    /** Required cost sharing percentage (e.g. 25.0) */
    percentage?: numeric;

    /** Free-text description of cost sharing requirements, including type, waiver info, or maintenance of effort */
    details?: string;
  };

  description: "Cost sharing or matching requirement for the opportunity";
}
