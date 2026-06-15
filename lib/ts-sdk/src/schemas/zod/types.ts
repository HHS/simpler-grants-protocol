/**
 * Types for the CommonGrants.Types namespace in the @common-grants/core library.
 *
 * These are scalar values that are used to define the types in the CommonGrants.Types namespace.
 *
 * @packageDocumentation
 */

import { z } from "zod";

// ############################################################################
// String types
// ############################################################################

export const UuidSchema = z.string().uuid();

// ############################################################################
// Numeric types
// ############################################################################

export const DecimalStringSchema = z
  .string()
  .regex(/^-?[0-9]+\.?[0-9]*$/, "Must be a valid decimal number represented as a string");

// ############################################################################
// Date types
// ############################################################################

/** Transform a date to ensure it's in UTC */
const ensureUTC = (date: string) => {
  const d = new Date(date);
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
};

/**
 * Accept a `Date` as input by normalizing it to a string before the string
 * validators run, so a caller can pass either an ISO string or a `Date`. The
 * string path keeps its strict validation unchanged; `toStr` renders a `Date`
 * in the format the inner schema expects. Output is still a `Date`.
 */
const acceptDate =
  (toStr: (d: Date) => string) =>
  (val: unknown): unknown =>
    val instanceof Date ? toStr(val) : val;

/** Schema for UTC datetime fields (accepts an ISO string or a `Date`; outputs a `Date`) */
export const UTCDateTimeSchema = z.preprocess(
  acceptDate(d => d.toISOString()),
  z.string().datetime().transform(ensureUTC)
);

/** Schema for ISO date format: YYYY-MM-DD (accepts a YYYY-MM-DD string or a `Date`; outputs a `Date`) */
export const ISODateSchema = z.preprocess(
  acceptDate(d => d.toISOString().slice(0, 10)),
  z
    .string()
    .date()
    .transform(str => new Date(str))
);

/** Schema for ISO time format: HH:MM:SS with optional fractional seconds and timezone (RFC 3339 partial-time) */
export const ISOTimeSchema = z.preprocess(val => {
  if (typeof val === "string") {
    // Remove timezone indicator (e.g., "17:00:00.123Z" → "17:00:00.123", "17:00:00+05:00" → "17:00:00")
    // Zod's time() accepts HH:MM:SS[.fraction] but not timezone indicators
    return val.replace(/(Z|[+-]\d{2}:\d{2})$/, "");
  }
  return val;
}, z.string().time());

/** Schema for offset datetime fields (accepts an ISO 8601 offset string or a `Date`; outputs a `Date`) */
export const OffsetDateTimeSchema = z.preprocess(
  acceptDate(d => d.toISOString()),
  z
    .string()
    .datetime({ offset: true })
    .transform(str => new Date(str))
);
