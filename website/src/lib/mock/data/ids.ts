/**
 * Every path parameter in the spec shares one `Types.uuid` example, so Swagger
 * UI pre-fills every id box with it. Each resource keeps one record with this
 * id so the default "Try it out" always finds a record.
 */
export const CANONICAL_RECORD_ID = "30a12e5e-5940-4c08-921c-17a8960fcf4b";

/** Well-formed UUID kept out of every fixture set, reserved for 404 demos. */
export const RESERVED_MISSING_ID = "00000000-0000-0000-0000-000000000000";
