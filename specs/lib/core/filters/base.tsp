namespace CommonGrants.Filters;

// ############################################################################
// Filter operators
// ############################################################################

/** Operators that filter a field based on an exact match to a value */
enum EquivalenceOperators {
  /** Equal to a value */
  eq,

  /** Not equal to a value */
  neq,
}

/** Operators that filter a field based on a comparison to a value */
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
enum ArrayOperators {
  /** In an array of values */
  in,

  /** Not in an array of values */
  not_in,
}

/** Operators that filter a field based on a string value */
enum StringOperators {
  /** Like */
  like,

  /** Not like */
  not_like,
}

/** Operators that filter a field based on a range of values */
enum RangeOperators {
  /** Between a range of values */
  between,

  /** Outside a range of values */
  outside,
}

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
model DefaultFilter {
  /** The operator to apply to the filter value */
  operator:
    | ComparisonOperators
    | ArrayOperators
    | StringOperators
    | RangeOperators
    | AllOperators;

  /** The value to use for the filter operation */
  value: unknown;
}
