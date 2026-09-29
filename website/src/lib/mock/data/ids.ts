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

/**
 * Award ids shared between the award fixtures and the opportunity fixtures
 * that reference them under `awards`. Kept here for the same reason as
 * `DOCUMENTED_EXAMPLE_ID`: the two fixture sets alias one definition instead
 * of repeating the UUID, and `fixtures.ts` cannot import `awards.ts` at
 * runtime without closing an import cycle.
 */
export const DOCUMENTED_AWARD_ID = "01912a8b-7c3d-7894-abcd-ef1234567890";
export const CLEAN_ENERGY_AWARD_ID = "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032";
export const CLEAN_ENERGY_AMENDMENT_AWARD_ID =
  "dd4e5f60-7182-4394-8d0e-1f2031425365";
export const RURAL_BROADBAND_AWARD_ID = "bb2c3d4e-5f60-4172-8b8c-9d0e1f203143";
export const WORKFORCE_APPRENTICESHIP_AWARD_ID =
  "cc3d4e5f-6071-4283-8c9d-0e1f20314254";
export const ARTS_CULTURE_AWARD_ID = "ee5f6071-8293-44a5-8e1f-2031425364a5";
export const COASTAL_RESILIENCE_AWARD_ID =
  "ff607182-93a4-45b6-8f20-31425364a5b6";
export const HEALTH_OUTREACH_AWARD_ID = "01718293-a4b5-46c7-9031-425364a5b6c7";
export const CIVIC_TECH_AWARD_ID = "23293a4b-c6d7-48e9-9253-64a5b6c7d8e9";
export const DIGITAL_LITERACY_AWARD_ID = "1218293a-b5c6-47d8-9142-5364a5b6c7d8";
