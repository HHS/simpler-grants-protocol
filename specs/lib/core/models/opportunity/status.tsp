import "@typespec/json-schema";
import "@typespec/openapi3";

namespace CommonGrants.Models;

// ########################################
// Opportunity status options
// ########################################

/** The set of values accepted for opportunity status */
enum OppStatusOptions {
  forecasted,
  open,
  closed,
  custom,
}

// ########################################
// Opportunity status model
// ########################################

/** The status of the opportunity */
model OppStatus {
  /** The status value */
  value: OppStatusOptions;

  /** A custom status value */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}
