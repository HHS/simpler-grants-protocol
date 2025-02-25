import "./base.tsp";

namespace CommonGrants.Filters;

// ############################################################################
// String comparison filter
// ############################################################################

/** A filter that applies a comparison to a string value */
model StringComparisonFilter {
  /** The operator to apply to the filter value */
  operator: EquivalenceOperators | StringOperators;

  /** The value to use for the filter operation */
  @example("value")
  value: string;
}

// ############################################################################
// String array filter
// ############################################################################

/** A filter that applies a filter to an array of strings */
model StringArrayFilter {
  /** The operator to apply to the filter value */
  operator: ArrayOperators;

  /** The value to use for the filter operation */
  @example(#["value1", "value2"])
  value: Array<string>;
}
