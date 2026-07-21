namespace CommonGrants.Fields;

// ########################################
// Model definitions
// ########################################

/** Template for defining extensible enum fields: constrains `value` to a set of
 * options (typically an enum that includes a `custom` option) while keeping the
 * shared `customValue` + `description` properties. Use this to define new
 * extensible enum fields so they stay consistent with the rest of the protocol.
 *
 * @template T The type (typically an enum) accepted for `value`.
 *
 * @example How to define a new extensible enum field
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

/** A value chosen from a known set of options that can also be extended with a
 * custom value when none of the predefined options fit: the chosen `value` is
 * paired with an optional `customValue` and a free-form `description`. To define
 * a typed field that follows this pattern, use `ExtensibleEnumT<T>`.
 */
@example(Examples.ExtensibleEnum.customStatus)
@doc("A value from a predefined set of options that can be extended with a custom value when needed")
@Versioning.added(CommonGrants.Versions.v0_4)
model ExtensibleEnum is ExtensibleEnumT<unknown>;

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
