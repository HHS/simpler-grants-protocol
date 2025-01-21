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
