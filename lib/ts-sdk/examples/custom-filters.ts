/**
 * Example: the custom-filters authoring and consumer surface, end to end.
 *
 * Three scenarios, each isolated in its own function:
 *
 *   1. Happy path (mock server): define a plugin with a custom field and a
 *      registered custom filter, build a client with `plugin.getClient()`, and
 *      search with a mix of default, registered, and ad-hoc filters.
 *   2. Authoring error: `definePlugin()` rejects an invalid registration
 *      (a filter named after a default field; an unknown filterType).
 *   3. Consumer error: `search()` rejects a bad filter value with `FilterError`
 *      before any HTTP request, for both a registered filter (wrong value
 *      family) and an ad-hoc filter (operator/value structure mismatch).
 *
 * Run with: `pnpm example:custom-filters`
 *
 * Scenario 1 talks to the mock server; start it first in another terminal with
 * `pnpm example:server`. If it is not running, scenario 1 is skipped and the two
 * offline scenarios still run.
 *
 * Filter buckets (ADR-0012):
 *   - Default filters (status, closeDateRange, ...) -> named top-level fields.
 *   - Registered custom filters (region) -> `customFilters` record, validated
 *     against their declared filterType.
 *   - Ad-hoc filters (any other key) -> `customFilters` passthrough, validated
 *     for operator/value structure only (no element-type check).
 */

import { definePlugin, F, FilterError } from "../src/extensions";

const BASE_URL = "http://localhost:8000";

// `as const` is load-bearing: it preserves the literal `filterType` values so
// `search({ filters })` can narrow filter names, operators, and value shapes.
const grantsGovPlugin = definePlugin({
  meta: {
    name: "grants.gov",
    version: "0.1.0",
    sourceSystem: "grants.gov",
    capabilities: ["customFields", "customFilters"],
  },
  schemas: {
    Opportunity: {
      customFields: {
        programCode: { fieldType: "string", description: "Funding program code" },
      },
    },
  },
  routes: {
    opportunities: {
      search: {
        filters: {
          region: {
            filterType: "stringArray",
            description: "Filter by region code (e.g. 'US-CA')",
          },
        },
      },
    },
  },
} as const);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

/** Collapse a (possibly multi-line) error message to a single readable line. */
function oneLine(message: string, max = 140): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}...` : collapsed;
}

// ############################################################################
// Scenario 1 — Happy path (mock server)
// ############################################################################

async function happyPath(): Promise<void> {
  console.log("=== Scenario 1: happy path (mock server) ===");

  const client = grantsGovPlugin.getClient({ baseUrl: BASE_URL });

  // A flat filters bag mixing all three buckets. The registered `region` key
  // autocompletes and type-checks its value; `status` is a default field;
  // `fundingType` is an ad-hoc passthrough.
  const filters = {
    status: F.in(["open"]), // default filter -> top-level field
    region: F.in(["US-CA", "US-NY"]), // registered custom filter -> customFilters
    fundingType: F.eq("grant"), // ad-hoc, well-formed -> customFilters passthrough
  };

  try {
    const result = await client.opportunities.search({ filters });

    console.log(`  items returned: ${result.items.length}`);
    console.log(`  per-row parse failures: ${result.errors.length}`);
    if (result.items[0]) {
      // The plugin schema is bound by default, so customFields are typed without
      // passing a per-call schema.
      const programCode = result.items[0].customFields?.programCode?.value;
      console.log(`  first opportunity: ${result.items[0].title}`);
      console.log(`  first programCode custom field: ${programCode ?? "(none)"}`);
    }
    // The mock server echoes the received filters, so we can confirm the
    // registered (region) and ad-hoc (fundingType) filters reached the wire.
    console.log(`  filters received by server: ${JSON.stringify(result.filterInfo?.filters)}`);
  } catch (e) {
    // A missing server should not fail the example; the offline scenarios below
    // assert behavior deterministically without a server.
    console.log(`  (skipped: could not reach ${BASE_URL}; run \`pnpm example:server\` first)`);
    console.log(`   ${(e as Error).message}`);
  }
}

// ############################################################################
// Scenario 2 — Authoring error (definePlugin rejects a bad registration)
// ############################################################################

function authoringErrors(): void {
  console.log("\n=== Scenario 2: authoring errors (definePlugin) ===");

  // 2a. A custom filter named after a default field (`status`) is rejected:
  // it would otherwise shadow the default bucket at classification time.
  try {
    definePlugin({
      routes: {
        opportunities: { search: { filters: { status: { filterType: "stringArray" } } } },
      },
    } as const);
    assert(false, "expected definePlugin to reject a default-name collision");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  default-name collision rejected: ${oneLine(e.message)}`);
  }

  // 2b. An unknown filterType is rejected. A typed author gets a compile error
  // here; the cast simulates a plain-JS author hitting the runtime backstop.
  try {
    definePlugin({
      routes: {
        opportunities: {
          search: { filters: { region: { filterType: "strin" as never } } },
        },
      },
    } as const);
    assert(false, "expected definePlugin to reject an unknown filterType");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  unknown filterType rejected: ${oneLine(e.message)}`);
  }

  // 2c. A misspelled resource name. Route keys are a closed union, so this is a
  // compile error (the `@ts-expect-error` below proves the type checker flags
  // it); an untyped caller hits the runtime backstop and throws the same way.
  try {
    definePlugin({
      routes: {
        // @ts-expect-error - "opportunties" is not a known resource name
        opportunties: { search: { filters: { region: { filterType: "stringArray" } } } },
      },
    } as const);
    assert(false, "expected definePlugin to reject a misspelled resource");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  misspelled resource rejected: ${oneLine(e.message)}`);
  }

  // 2d. A misspelled method name is caught the same way: a compile error, with
  // a runtime backstop for untyped callers.
  try {
    definePlugin({
      routes: {
        opportunities: {
          // @ts-expect-error - "serach" is not a known route method
          serach: { filters: { region: { filterType: "stringArray" } } },
        },
      },
    } as const);
    assert(false, "expected definePlugin to reject a misspelled method");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  misspelled method rejected: ${oneLine(e.message)}`);
  }
}

// ############################################################################
// Scenario 3 — Consumer error (search rejects a bad value before any request)
// ############################################################################

async function consumerErrors(): Promise<void> {
  console.log("\n=== Scenario 3: consumer errors (search, no request sent) ===");

  const client = grantsGovPlugin.getClient({ baseUrl: BASE_URL });

  // 3a. A registered filter with the wrong value family. `region` is a
  // stringArray, so `F.eq()` (a scalar) is a compile error; the cast simulates
  // a plain-JS caller hitting the runtime backstop.
  try {
    await client.opportunities.search({
      filters: { region: F.eq("US-CA") } as never,
    });
    assert(false, "expected a FilterError for a wrong registered value family");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  registered wrong value family rejected: ${oneLine(e.message)}`);
  }

  // 3b. An ad-hoc filter with an incoherent operator/value pair. `in` requires
  // an array value; a scalar is rejected. Ad-hoc keys are accepted at the type
  // level (they support arbitrary escape-hatch filters), so this is caught at
  // runtime rather than compile time.
  try {
    await client.opportunities.search({
      filters: { fundingType: { operator: "in", value: "grant" } },
    });
    assert(false, "expected a FilterError for an ad-hoc operator/value mismatch");
  } catch (e) {
    if (!(e instanceof FilterError)) throw e;
    console.log(`  ad-hoc operator/value mismatch rejected: ${oneLine(e.message)}`);
  }
}

// ############################################################################
// Run all scenarios in source order
// ############################################################################

async function main(): Promise<void> {
  await happyPath();
  authoringErrors();
  await consumerErrors();
  console.log("\n✓ custom-filters example complete");
}

void main();
