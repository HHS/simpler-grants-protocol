namespace CommonGrants.Models;

/** A time on a clock, without a timezone, in ISO 8601 format HH:mm:ss */
@example(isoTime.fromISO("17:00:00"))
scalar isoTime extends plainTime;

/** A date on a calendar in ISO 8601 format YYYY-MM-DD */
@example(isoDate.fromISO("2025-01-01"))
scalar isoDate extends plainTime;

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
