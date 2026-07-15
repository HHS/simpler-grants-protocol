namespace CommonGrants.Fields;

// ########################################
// Model definitions
// ########################################

/** A value from an open-ended set of options: a `value` of unspecified shape,
 * an optional `customValue` for caller-defined options, and an optional
 * free-form `description`. Use this when the value set is open-ended and a
 * typed constraint isn't appropriate. For typed variants, see `ExtensibleEnumT<T>`.
 */
@example(Examples.ExtensibleEnum.customStatus)
@doc("A value from an open-ended set of options")
@Versioning.added(CommonGrants.Versions.v0_4)
model ExtensibleEnum {
  /** The selected value. May be from a predefined set of options or a custom value */
  value: unknown;

  /** A custom value, used when the selected value does not fit a predefined option */
  customValue?: string;

  /** A human-readable description of the value */
  description?: string;
}

/** A typed extensible enum: `value` is constrained to a caller-supplied enum (or
 * other type), with a free-form `description` for annotation or custom-value
 * details.
 *
 * @template T The type (typically an enum) accepted for `value`.
 *
 * @example How to instantiate a typed extensible enum
 *
 * ```typespec
 * enum OppStatusOptions {
 *   forecasted,
 *   open,
 *   closed,
 *   custom,
 * }
 *
 * model OppStatus is ExtensibleEnumT<OppStatusOptions>;
 * ```
 */
@Versioning.added(CommonGrants.Versions.v0_4)
model ExtensibleEnumT<T> {
  /** The selected value, from a predefined set of options */
  value: T;

  /** A custom value, used when the selected value is the `custom` option */
  customValue?: string;

  /** A human-readable description of the value */
  description?: string;
}

// ########################################
// Model examples
// ########################################

/** Examples of the ExtensibleEnum model */
namespace Examples.ExtensibleEnum {
  /** An example of an extensible enum with a custom value */
  const customStatus = #{
    value: "custom",
    customValue: "underReview",
    description: "The application is under review by the program team",
  };
}
