import "./base.tsp";
import "../types.tsp";

namespace CommonGrants.Filters;

// ############################################################################
// Date comparison filter
// ############################################################################

/** Filters by comparing a field to a date value */
model DateComparisonFilter {
  /** The operator to apply to the filter value */
  operator: ComparisonOperators;

  /** The value to use for the filter operation */
  @example(Types.isoDate.fromISO("2021-01-01"))
  value: Types.isoDate | utcDateTime | offsetDateTime;
}

// ############################################################################
// Date range filter
// ############################################################################

/** Filters by comparing a field to a range of date values */
model DateRangeFilter {
  /** The operator to apply to the filter value */
  operator: RangeOperators;

  /** The value to use for the filter operation */
  @example(#{
    min: Types.isoDate.fromISO("2021-01-01"),
    max: Types.isoDate.fromISO("2021-01-02"),
  })
  value: {
    min: Types.isoDate | utcDateTime | offsetDateTime;
    max: Types.isoDate | utcDateTime | offsetDateTime;
  };
}
