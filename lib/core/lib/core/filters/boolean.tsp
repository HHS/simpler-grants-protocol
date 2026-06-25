import "./base.tsp";

namespace CommonGrants.Filters;

// ############################################################################
// Boolean comparison filter
// ############################################################################

/** A filter that applies a comparison to a boolean value */
@Versioning.added(CommonGrants.Versions.v0_4)
model BooleanComparisonFilter {
  /** The operator to apply to the filter value */
  operator: EquivalenceOperators;

  /** The value to use for the filter operation */
  @example(true)
  value: boolean;
}
