/**
 * Ids the whole mock agrees on (#3C-2-T1).
 *
 * Extracted when the mock grew past opportunities, because the interesting
 * property of these two values is that they are *not* per-resource.
 *
 * **Why one id serves every resource.** Every path parameter in the spec —
 * `oppId`, `awdId`, `orgId`, `appId`, `formId`, `compId`, `changeId` — is
 * declared as `Types.uuid`, and the emitted OpenAPI resolves all of them to the
 * same `CommonGrants.Types.uuid` schema, which publishes a single `example`.
 * Swagger UI pre-fills a path box from that example, so *every* "Try it out" on
 * *every* detail route arrives carrying the same uuid. A resource whose fixture
 * set doesn't contain it answers 404 on the first Execute a visitor runs with
 * the field untouched — which is exactly the failure #3C-2-T1 exists to remove.
 *
 * Reusing one uuid across resource types is legal, not a collision: ids are
 * unique within a resource, and nothing in the protocol says an award and an
 * opportunity may not share one. It is also load-bearing for the two-parameter
 * routes, where *both* boxes pre-fill with the same value — see
 * `CANONICAL_RECORD_ID`'s use in the application/form-response fixtures.
 *
 * If the spec ever gives the id parameters distinct examples, this constant
 * splits into one per resource and the fixture sets follow; the
 * `swagger-prefill` assertions in the handler suites are what would fail first.
 */

/**
 * The value the specs publish as the `example` on `CommonGrants.Types.uuid`,
 * and therefore the id Swagger UI pre-fills into every path-parameter box.
 *
 * The first record of every fixture set carries it (see `CANONICAL_*_ID` in
 * each `data/` module), so the pre-filled Execute resolves to a real record on
 * every detail route rather than demonstrating a 404.
 */
export const CANONICAL_RECORD_ID = "30a12e5e-5940-4c08-921c-17a8960fcf4b";

/**
 * A well-formed UUID deliberately absent from every fixture set, reserved so
 * each 404 branch has a stable id to demonstrate. It must never be given to a
 * record in any resource.
 */
export const RESERVED_MISSING_ID = "00000000-0000-0000-0000-000000000000";
