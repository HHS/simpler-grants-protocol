import "../../routes/utils.tsp";
import "../../filters/index.tsp";

namespace CommonGrants.Models;

// ############################################################################
// Helper models
// ############################################################################

/** Filters to apply when searching for opportunities */
model OppFilters {
  /** The default filters to apply to the search */
  ...OppDefaultFilters;

  /** Additional implementation-defined filters to apply to the search */
  customFilters?: Record<Filters.DefaultFilter>;
}

// ############################################################################
// Payload models
// ############################################################################

model OppDefaultFilters extends Record<Filters.DefaultFilter> {
  /** The status of the opportunity matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["forecasted", "open"],
  })
  status?: Filters.StringArrayFilter;

  /** The close date of the opportunity is between the given range */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: Types.isoDate.fromISO("2021-01-01"),
      max: Types.isoDate.fromISO("2021-01-02"),
    },
  })
  closeDateRange?: Filters.DateRangeFilter;
}
