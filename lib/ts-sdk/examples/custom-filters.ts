/**
 * Example script demonstrating custom-filters registration and classification. Shows:
 *   1. Defining a grants.gov plugin with route-keyed custom filter specs via
 *      `definePlugin({ routes: { ... } } as const)`.
 *   2. Building a unified consumer `filters` object mixing default fields
 *      (status, closeDateRange), pre-registered custom filters (agency,
 *      fundingProgram), and an ad-hoc filter (legacyTag) — using `F.*` helpers.
 *      Control fields (query, maxResults, signal, schema) stay OUTSIDE `filters` (D-12).
 *   3. Calling `classifyFilters` to produce the ADR-0012 wire body:
 *      default fields at top-level, custom + ad-hoc under `customFilters`.
 *   4. A COMMENT block (not executed) demonstrating the `as const` widening
 *      trap — see custom-filters-types.spec.ts for the live compile-time proof.
 *
 * Run with: `pnpm example:custom-filters`
 *
 * @remarks
 * The three-bucket classification rule (D-15 / ADR-0012):
 *   - Default filters (status, closeDateRange, ...) → named top-level fields on the wire body.
 *   - Pre-registered custom filters (agency, fundingProgram) → `customFilters` record.
 *   - Ad-hoc filters (legacyTag) → `customFilters` passthrough (shape-only validated).
 *
 * No network I/O: this example BUILDS the request body and prints it; it does NOT
 * send it over the wire (transport is out of scope per ADR-0022 / CLAUDE.md).
 */

import { classifyFilters, definePlugin, F } from "../src/extensions";

// ############################################################################
// Step 1 — Define the grants.gov plugin with route-keyed custom filters
// ############################################################################

// `as const` is load-bearing (D-13): it preserves literal `filterType` values so
// that TypeScript can narrow call-site filter keys, operators, and value shapes.
// Without `as const`, `filterType` widens to `string` and the typed guard is lost.
// See custom-filters-types.spec.ts for the compile-time proof.
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
// IMPORTANT (D-12): control fields (query, maxResults, signal, schema) stay OUTSIDE
// the `filters` object. The classifier handles only the filter predicates.
const searchParams = {
  // Control fields — outside `filters`
  query: "conservation research",
  maxResults: 25,

  // The flat consumer filters object
  filters: {
    // Default filters — will land as named top-level fields on the wire body
    status: F.in(["open", "forecasted"]),
    closeDateRange: F.between("2025-01-01", "2025-12-31"),

    // Pre-registered custom filters — will land in customFilters record
    agency: F.in(["HHS", "DOE", "NSF"]),
    fundingProgram: F.like("*Conservation*"),

    // Ad-hoc filter (not registered in the plugin) — flows to customFilters verbatim
    // (shape-only validated; operator/filterType not enforced for ad-hoc keys, D-13)
    legacyTag: F.eq("conservation-2024"),
  },
};

console.log("\n=== Step 2: Consumer filters built ===");
console.log("Consumer-facing filters (flat):");
console.log(JSON.stringify(searchParams.filters, null, 2));

// ############################################################################
// Step 3 — Classify into the ADR-0012 OppFilters wire body
// ############################################################################

// `classifyFilters` runs the three-bucket classification:
//   1. status, closeDateRange → top-level named wire fields
//   2. agency, fundingProgram (registered) → customFilters record
//   3. legacyTag (ad-hoc) → customFilters passthrough
// `grantsGovPlugin.routes` is non-null here — we declared it above as a
// non-optional literal object. The `!` assertion removes the `undefined` from
// the union type that `Plugin.routes?:` introduces (routes is optional in the
// interface to support plugins that don't declare filters).
const wireBody = classifyFilters(
  grantsGovPlugin.routes!,
  "opportunities",
  "search",
  searchParams.filters
);

console.log("\n=== Step 3: Classified wire body (OppFilters) ===");
console.log(JSON.stringify(wireBody, null, 2));

// ############################################################################
// Assertions — verify the three-bucket classification
// ############################################################################

function fail(message: string): never {
  console.error(`ASSERTION FAILED: ${message}`);
  process.exit(1);
}

// Default filters must appear as named top-level fields
if (!wireBody.status) fail("status should be a top-level field (default filter bucket)");
if (!wireBody.closeDateRange)
  fail("closeDateRange should be a top-level field (default filter bucket)");

// Custom + ad-hoc filters must land in customFilters record
if (!wireBody.customFilters) fail("customFilters should exist for registered + ad-hoc filters");
if (!wireBody.customFilters.agency)
  fail("agency should be in customFilters (registered custom filter)");
if (!wireBody.customFilters.fundingProgram)
  fail("fundingProgram should be in customFilters (registered custom filter)");
if (!wireBody.customFilters.legacyTag)
  fail("legacyTag should be in customFilters (ad-hoc passthrough)");

// Default filter keys must NOT appear under customFilters
if ((wireBody.customFilters as Record<string, unknown>).status)
  fail("status must NOT be in customFilters — it is a default filter");

console.log("\n=== Assertions passed ===");
console.log("  status        → top-level (default filter bucket)");
console.log("  closeDateRange → top-level (default filter bucket)");
console.log("  agency        → customFilters (registered custom filter)");
console.log("  fundingProgram → customFilters (registered custom filter)");
console.log("  legacyTag     → customFilters (ad-hoc passthrough)");

// ############################################################################
// Step 4 — The `as const` widening trap (comment block — live proof in spec)
// ############################################################################

// If you forget `as const` on the definePlugin call, TypeScript widens the
// `filterType` values from literal strings to the broad `string` type. The
// TypedConsumerFilters narrowing layer then cannot distinguish filter keys or
// validate operator/value shapes at the call site — unknown keys and wrong
// value types silently pass the type checker.
//
// The live compile-time proof is in:
//   lib/ts-sdk/__tests__/extensions/custom-filters-types.spec.ts
// (see "WITHOUT as const — widening trap (D-13)" describe block)
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
//   //   // → TypedConsumerFilters resolves to never → FilterParams falls back to Record<string, unknown>
//   //   // → unknown keys, wrong operators, and wrong value shapes silently accepted

console.log("\n✓ custom-filters example complete");
console.log(
  "  See __tests__/extensions/custom-filters-types.spec.ts for compile-time narrowing proof"
);
