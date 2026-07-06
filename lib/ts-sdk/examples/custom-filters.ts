/**
 * Example script demonstrating custom-filters registration and classification. Shows:
 *   1. Defining a grants.gov plugin with route-keyed custom filter specs via
 *      `definePlugin({ routes: { ... } } as const)`.
 *   2. Building a unified consumer `filters` object mixing default fields
 *      (status, closeDateRange), pre-registered custom filters (agency,
 *      fundingProgram), and an ad-hoc filter (legacyTag) — using `F.*` helpers.
 *      Control fields (query, maxResults, signal, schema) stay OUTSIDE `filters`.
 *   3. Calling `categorizeFilters` to produce the ADR-0012 request body:
 *      default fields at top-level, custom + ad-hoc under `customFilters` —
 *      an invalid value on any key throws `FilterError` before a body is built.
 *   4. Building a plugin-bound client via `plugin.getClient()` and showing the
 *      fail-fast guard: an invalid registered filter value rejects BEFORE any
 *      HTTP request (so this step needs no server).
 *   5. A COMMENT block (not executed) demonstrating the `as const` widening
 *      trap — see custom-filters-types.ts for the compile-time narrowing assertions.
 *
 * Run with: `pnpm example:custom-filters`
 *
 * @remarks
 * The three-bucket classification rule (ADR-0012):
 *   - Default filters (status, closeDateRange, ...) → named top-level fields on the request body.
 *   - Pre-registered custom filters (agency, fundingProgram) → `customFilters` record.
 *   - Ad-hoc filters (legacyTag) → `customFilters` passthrough (shape-only validated).
 *
 * No network I/O: this example BUILDS the request body and prints it; it does NOT
 * send it over the wire — transport is not handled here.
 */

import { categorizeFilters, definePlugin, F, FilterError } from "../src/extensions";

// ############################################################################
// Step 1 — Define the grants.gov plugin with route-keyed custom filters
// ############################################################################

// `as const` is load-bearing: it preserves literal `filterType` values so
// that TypeScript can narrow call-site filter keys, operators, and value shapes.
// Without `as const`, `filterType` widens to `string` and the typed guard is lost.
// See custom-filters-types.ts for the compile-time proof.
const grantsGovPlugin = definePlugin({
  meta: {
    name: "grants.gov",
    version: "0.1.0",
    sourceSystem: "grants.gov",
    capabilities: ["customFilters"],
  },
  routes: {
    opportunities: {
      search: {
        filters: {
          agency: {
            filterType: "stringArray",
            description: "Filter by funding agency code (e.g. 'HHS', 'DOE')",
          },
          fundingProgram: {
            filterType: "stringComparison",
            description: "Filter by funding program name",
          },
          // NOTE: `as const` is what makes these `filterType` values
          // literal strings ("stringArray", "stringComparison") instead of
          // widened `string`. Without it, the typed narrowing layer collapses.
        },
      },
    },
  },
} as const);

console.log("=== Step 1: Plugin registered ===");
console.log(`Plugin name: ${grantsGovPlugin.meta?.name}`);
console.log(
  `Registered filters: ${Object.keys(grantsGovPlugin.routes?.opportunities?.search?.filters ?? {}).join(", ")}`
);

// ############################################################################
// Step 2 — Build a unified consumer filters object
// ############################################################################

// The consumer-facing `filters` object is flat — it mixes all three filter types
// without the caller needing to know which bucket each belongs to.
//
// IMPORTANT: control fields (query, maxResults, signal, schema) stay OUTSIDE
// the `filters` object. The classifier handles only the filter predicates.
const searchParams = {
  // Control fields — outside `filters`
  query: "conservation research",
  maxResults: 25,

  // The flat consumer filters object
  filters: {
    // Default filters — will land as named top-level fields on the request body
    status: F.in(["open", "forecasted"]),
    closeDateRange: F.between("2025-01-01", "2025-12-31"),

    // Pre-registered custom filters — will land in customFilters record
    agency: F.in(["HHS", "DOE", "NSF"]),
    fundingProgram: F.like("*Conservation*"),

    // Ad-hoc filter (not registered in the plugin) — flows to customFilters verbatim
    // (shape-only validated; operator/filterType not enforced for ad-hoc keys)
    legacyTag: F.eq("conservation-2024"),
  },
};

console.log("\n=== Step 2: Consumer filters built ===");
console.log("Consumer-facing filters (flat):");
console.log(JSON.stringify(searchParams.filters, null, 2));

// ############################################################################
// Step 3 — Classify into the ADR-0012 OppFilters request body
// ############################################################################

// `categorizeFilters` runs the three-bucket classification:
//   1. status, closeDateRange → top-level named request-body fields
//   2. agency, fundingProgram (registered) → customFilters record
//   3. legacyTag (ad-hoc) → customFilters passthrough
// `grantsGovPlugin.routes` is non-null here — we declared it above as a
// non-optional literal object. The `!` assertion removes the `undefined` from
// the union type that `Plugin.routes?:` introduces (routes is optional in the
// interface to support plugins that don't declare filters).
// `categorizeFilters` is fail-fast: an invalid value on any key — standard,
// registered, or ad-hoc — throws `FilterError` before a request body exists.
const requestBody = categorizeFilters(
  grantsGovPlugin.routes!,
  "opportunities",
  "search",
  searchParams.filters
);

console.log("\n=== Step 3: Classified request body (OppFilters) ===");
console.log(JSON.stringify(requestBody, null, 2));

// ############################################################################
// Assertions — verify the three-bucket classification
// ############################################################################

function fail(message: string): never {
  console.error(`ASSERTION FAILED: ${message}`);
  process.exit(1);
}

// Default filters must appear as named top-level fields
if (!requestBody.status) fail("status should be a top-level field (default filter bucket)");
if (!requestBody.closeDateRange)
  fail("closeDateRange should be a top-level field (default filter bucket)");

// Custom + ad-hoc filters must land in customFilters record
if (!requestBody.customFilters) fail("customFilters should exist for registered + ad-hoc filters");
if (!requestBody.customFilters.agency)
  fail("agency should be in customFilters (registered custom filter)");
if (!requestBody.customFilters.fundingProgram)
  fail("fundingProgram should be in customFilters (registered custom filter)");
if (!requestBody.customFilters.legacyTag)
  fail("legacyTag should be in customFilters (ad-hoc passthrough)");

// Default filter keys must NOT appear under customFilters
if ((requestBody.customFilters as Record<string, unknown>).status)
  fail("status must NOT be in customFilters — it is a default filter");

// Fail-fast demo: a wrong value family on a registered filter throws
// FilterError before any request body is produced.
try {
  categorizeFilters(grantsGovPlugin.routes!, "opportunities", "search", {
    agency: { operator: "eq", value: 42 }, // agency is a stringArray filter
  });
  fail("expected categorizeFilters to throw FilterError for an invalid registered value");
} catch (e) {
  if (!(e instanceof FilterError)) throw e;
  console.log(`\n=== Fail-fast demo ===`);
  console.log(`FilterError (expected): ${e.message.split("\n")[0]}`);
}

console.log("\n=== Assertions passed ===");
console.log("  status        → top-level (default filter bucket)");
console.log("  closeDateRange → top-level (default filter bucket)");
console.log("  agency        → customFilters (registered custom filter)");
console.log("  fundingProgram → customFilters (registered custom filter)");
console.log("  legacyTag     → customFilters (ad-hoc passthrough)");

// ############################################################################
// Step 5 — plugin.getClient(): the consumer path
// ############################################################################

// The client is pre-bound to the plugin: responses parse with the plugin's
// compiled schema by default, and `search({ filters })` types the registered
// filter names. Against a live API (e.g. `pnpm example:server`), the consumer
// flow looks like:
//
//   const result = await client.opportunities.search({
//     filters: { agency: F.in(["HHS"]) },
//   });
//   for (const opp of result.items) console.log(opp.title);        // valid rows
//   // ParseFailure rows — err.raw may carry PII; log a redacted projection
//   for (const err of result.errors) console.log(err.index, err.error.message);
//
// (Executed versions live in __tests__/extensions/get-client.spec.ts.)
const client = grantsGovPlugin.getClient({ baseUrl: "http://localhost:8000" });

// Fail-fast without a server: an invalid registered value throws BEFORE any
// HTTP request is made, so this rejects even though nothing is listening.
// (Async so this file compiles under CommonJS module settings — no top-level
// await; the final logs chain off it below so output order matches source order.)
async function step5FailFastDemo(): Promise<void> {
  try {
    await client.opportunities.search({
      // Wrong value family for a stringArray filter — also a compile error;
      // the cast simulates a plain-JS caller hitting the runtime backstop.
      filters: { agency: { operator: "eq", value: 42 } } as never,
    });
    fail("expected search() to reject with FilterError before any request");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log("\n=== Step 5: getClient fail-fast demo ===");
    console.log(`search() rejected before any request (expected): ${e.message.split("\n")[0]}`);
    console.log("\n✓ getClient consumer path complete");
  }
}

// ############################################################################
// Step 6 — The `as const` widening trap (comment block — not executed)
// ############################################################################

// If you forget `as const` on the definePlugin call, TypeScript widens the
// `filterType` values from literal strings to the broad `string` type. The
// TypedConsumerFilters narrowing layer then cannot distinguish filter keys or
// validate operator/value shapes at the call site — unknown keys and wrong
// value types silently pass the type checker.
//
// The compile-time narrowing assertions (the errors that fire WITH `as const`)
// live in: lib/ts-sdk/__tests__/extensions/custom-filters-types.ts
//
// Example of what NOT to do:
//
//   const badPlugin = definePlugin({
//     routes: {
//       opportunities: {
//         search: { filters: { agency: { filterType: "stringArray" } } },
//       },
//     },
//   }); // ← MISSING `as const`
//
//   // When `badPlugin` is stored as `Plugin` (no TRoutes generic),
//   // or when `as const` is omitted and the function's const-generic cannot
//   // infer the literal, the typed guard collapses and the following would NOT
//   // be caught at compile time:
//   //   badPlugin.routes?.opportunities?.search?.filters  // type: Record<string, CustomFilterSpec>
//   //   // → literal filterTypes are lost, so per-key narrowing is impossible
//   //   // → unknown keys, wrong operators, and wrong value shapes silently accepted

// Chained after Step 5 settles: the completion banner provably prints last.
void step5FailFastDemo().then(() => {
  console.log("\n✓ custom-filters example complete");
  console.log(
    "  See __tests__/extensions/custom-filters-types.ts for compile-time narrowing proof"
  );
});
