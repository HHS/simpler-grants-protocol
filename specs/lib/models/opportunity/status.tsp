import "@typespec/json-schema";
import "@typespec/openapi3";

import "../custom-enum.tsp";

namespace CommonGrants.Models.Opportunity;

/** Union of values accepted for opportunity status */
@JsonSchema.oneOf
@OpenAPI.oneOf
@discriminator("value")
union OppStatus {
  /** Opportunity is anticipated, but not yet accepting applications */
  forecasted: {
    value: "forecasted",
    description?: "Opportunity is anticipated, but not yet accepting applications",
  },

  /** Opportunity is actively accepting applications */
  open: {
    value: "open",
    description?: "Opportunity is actively accepting applications",
  },

  /** Opportunity is no longer accepting applications */
  closed: {
    value: "closed",
    description?: "Opportunity is no longer accepting applications",
  },

  /** Custom opportunity status */
  custom: CustomEnumValue,
}
