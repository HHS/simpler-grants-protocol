using TypeSpec.JsonSchema;

/** A collection of base data types used throughout the CommonGrants API
 *
 * @example How to use the `Types` namespace
 *
 * ```typespec
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Types namespace
 *
 * model MyModel {
 *   @example("30a12e5e-5940-4c08-921c-17a8960fcf4b")
 *   id: Types.uuid;
 *
 *   @example(Types.isoDate.fromISO("2025-01-01"))
 *   keyDate: Types.isoDate;
 * }
 * ```
 */
@jsonSchema
namespace CommonGrants.Types;

/** A time on a clock, without a timezone, in ISO 8601 format HH:mm:ss */
@example(isoTime.fromISO("17:00:00"))
scalar isoTime extends plainTime;

/** A date on a calendar in ISO 8601 format YYYY-MM-DD */
@example(isoDate.fromISO("2025-01-01"))
scalar isoDate extends plainDate;

/** A calendar year */
@example("2025")
@pattern("^[0-9]{4}$")
scalar calendarYear extends string;

/** A universally unique identifier */
@example("30a12e5e-5940-4c08-921c-17a8960fcf4b")
@format("uuid")
scalar uuid extends string;

/** A decimal number (with variable scale) encoded as a string, to avoid floating point issues */
@pattern(
  "^-?[0-9]+\\.?[0-9]*$",
  "Must be a valid decimal number represented as a string"
)
@example("100", #{ title: "Scale 0" })
@example("100.5", #{ title: "Scale 1" })
@example("-100.5", #{ title: "Negative, scale 2" })
scalar decimalString extends string;

/** An email address */
@example("test@example.com")
@format("email")
scalar email extends string;

/** An Employer Identification Number (EIN) */
@example("123456789")
@pattern("^[0-9]{2}-[0-9]{7}$")
scalar employerTaxId extends string;

/** A Unique Entity Identifier (UEI) */
@example("ABC1234567890")
@pattern("^[A-z0-9]{12}$")
scalar samUEI extends string;

/** A Data Universal Numbering System (DUNS) number */
@example("123456789012")
@pattern("^[0-9]{9}$")
scalar duns extends string;
