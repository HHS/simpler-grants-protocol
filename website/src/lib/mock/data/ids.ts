/**
 * Every path parameter in the spec shares one `Types.uuid` example, so Swagger
 * UI pre-fills every id box with it. Each resource keeps one record with this
 * id so the default "Try it out" always finds a record.
 */
export const CANONICAL_RECORD_ID = "30a12e5e-5940-4c08-921c-17a8960fcf4b";

/** Well-formed UUID kept out of every fixture set, reserved for 404 demos. */
export const RESERVED_MISSING_ID = "00000000-0000-0000-0000-000000000000";

/**
 * The id the spec's `CompetitionBase` and `FormBase` examples both publish —
 * two models, one example value. Kept here so the competition and form
 * fixtures alias one definition rather than repeating the UUID.
 */
export const DOCUMENTED_EXAMPLE_ID = "b7c1e2f4-8a3d-4e2a-9c5b-1f2e3d4c5b6a";
