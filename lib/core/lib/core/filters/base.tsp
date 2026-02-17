namespace CommonGrants.Filters;

// ############################################################################
// Filter operators
// ############################################################################

/** Operators that filter a field based on an exact match to a value */
@Versioning.added(CommonGrants.Versions.v0_1)
enum EquivalenceOperators {
  /** Equal to a value */
  eq,

  /** Not equal to a value */
  neq,
}

/** Operators that filter a field based on a comparison to a value */
@Versioning.added(CommonGrants.Versions.v0_1)
enum ComparisonOperators {
  /** Greater than a value */
  gt,

  /** Greater than or equal to a value */
  gte,

  /** Less than a value */
  lt,

  /** Less than or equal to a value */
  lte,
}

/** Operators that filter a field based on an array of values */
@Versioning.added(CommonGrants.Versions.v0_1)
enum ArrayOperators {
  /** In an array of values */
  in,

  /** Not in an array of values */
  notIn,
}

/** Operators that filter a field based on a string value */
@Versioning.added(CommonGrants.Versions.v0_1)
enum StringOperators {
  /** Like */
  like,

  /** Not like */
  notLike,
}

/** Operators that filter a field based on a range of values */
@Versioning.added(CommonGrants.Versions.v0_1)
enum RangeOperators {
  /** Between a range of values */
  between,

  /** Outside a range of values */
  outside,
}

@Versioning.added(CommonGrants.Versions.v0_1)
enum AllOperators {
  ...EquivalenceOperators,
  ...ComparisonOperators,
  ...ArrayOperators,
  ...RangeOperators,
  ...StringOperators,
}

// ############################################################################
// Filter model
// ############################################################################

/** A base filter model that can be used to create more specific filter models */
@Versioning.added(CommonGrants.Versions.v0_1)
model DefaultFilter {
  /** The operator to apply to the filter value */
  operator:
    | EquivalenceOperators
    | ComparisonOperators
    | ArrayOperators
    | StringOperators
    | RangeOperators
    | AllOperators;

  /** The value to use for the filter operation */
  value: unknown;
}
