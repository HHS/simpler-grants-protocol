/**
 * Custom-filter search against Simpler.Grants.gov, via the cg-grants-gov plugin.
 *
 * The downstream flow an adopter writes:
 *
 *   1. Import the plugin (`@common-grants/cg-grants-gov`). It already registers
 *      the grants.gov search custom filters — agency, applicantType,
 *      fundingInstrument, costSharing — so the consumer doesn't declare them.
 *   2. Build a flat filter dict with the `F.*` builders: a default core filter
 *      (`status`) plus the four registered customs.
 *   3. `plugin.getClient(config)` returns a client with the plugin's routes and
 *      schemas bound, so `opportunities.search({ filters })` is typed by the
 *      registered filters and rows parse as grants.gov opportunities.
 *
 * The client classifies the flat dict into the three-bucket request body — the
 * default filter stays a top-level field, the four customs go under
 * `customFilters` — and POSTs it. A wrong-typed filter throws `FilterError`
 * before any request (fail-fast).
 *
 * Run against a CommonGrants endpoint on http://localhost:8080:
 *
 *   pnpm example:grants-gov-custom-filters [searchTerm]
 */

import plugin from "@common-grants/cg-grants-gov";
import { Auth } from "@common-grants/sdk/client";
import { classifyFilters, F } from "@common-grants/sdk/extensions";

const searchTerm = process.argv[2] ?? "education";
const baseUrl = "http://localhost:8080";

// A consumer's flat filter dict: one default core filter + four grants.gov
// customs. Each F.* builder returns the value model the registered filter expects.
const filters = {
  status: F.in(["open", "forecasted"]),
  agency: F.in(["HHS", "USDA"]),
  applicantType: F.in(["government_state", "government_county"]),
  fundingInstrument: F.in(["grant", "cooperative_agreement"]),
  costSharing: F.eq(false),
};

async function main(): Promise<void> {
  console.log("=== Grants.gov Custom-Filter Search ===");
  console.log(`Search term: ${searchTerm}`);
  console.log(`Base URL:    ${baseUrl}\n`);

  // The request body the client will POST (classifyFilters runs inside search);
  // shown here so the customFilters split is visible without a live endpoint:
  // status stays top-level, the four customs land under customFilters.
  const routes = plugin.routes;
  if (!routes) throw new Error("plugin registered no custom filter routes");
  const body = classifyFilters(routes, "opportunities", "search", filters);
  console.log("Request body (default fields + customFilters):");
  console.log(JSON.stringify(body, null, 2), "\n");

  // getClient binds the plugin's routes + schemas: search({ filters }) is typed
  // by the registered filters and rows parse as grants.gov opportunities.
  const client = plugin.getClient({ baseUrl, auth: Auth.apiKey("two_org_user_key") });
  const result = await client.opportunities.search({ query: searchTerm, filters });

  console.log(`${result.items.length} opportunit(y/ies) matched:`);
  for (const opp of result.items) {
    console.log(`  - ${opp.title} [${opp.status.value}] (${opp.id})`);
  }
}

void main();
