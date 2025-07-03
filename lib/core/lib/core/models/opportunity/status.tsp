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
@example(Examples.OppStatus.custom)
@example(Examples.OppStatus.default)
model OppStatus {
  /** The status value, from a predefined set of options */
  value: OppStatusOptions;

  /** A custom status value */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// ########################################
// Opportunity status model examples
// ########################################

/** Examples of the OppStatus model */
namespace Examples.OppStatus {
  const default = #{
    value: OppStatusOptions.open,
    description: "The opportunity is currently accepting applications",
  };

  const custom = #{
    value: OppStatusOptions.custom,
    customValue: "archived",
    description: "The opportunity is archived and shouldn't appear in search results",
  };
}
