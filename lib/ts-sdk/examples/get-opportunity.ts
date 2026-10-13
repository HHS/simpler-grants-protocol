/**
 * Example script demonstrating how to fetch a single opportunity by ID.
 *
 * Run with: pnpm example:get <oppId>
 */

import { Client, Auth } from "../src/client/index.js";

const oppId = process.argv[2];

if (!oppId) {
  console.error("Usage: pnpm example:get <oppId>");
  process.exit(1);
}

const baseUrl = process.env.CG_BASE_URL ?? "http://localhost:8000";
const apiKey = process.env.CG_API_KEY ?? "<your-api-key>";

const client = new Client({
  baseUrl,
  auth: Auth.apiKey(apiKey),
  timeout: 5000,
});

async function main() {
  const opp = await client.opportunities.get(oppId);

  console.log(`Opportunity ${oppId}:`);
  console.log(`  Title: ${opp.title}`);
  console.log(`  ID: ${opp.id}`);
  console.log(`  Status: ${opp.status.value}`);

  // get() parses the detail shape by default, so related awards (if the
  // implementation publishes the link) come back as references alongside the
  // opportunity. A reference isn't dereferenceable through this API; join on
  // its `identifiers` against your own award records, or fetch the full
  // record from GET /common-grants/awards/{id} where the server exposes it.
  if (opp.awards === undefined) {
    console.log("  Awards: link not published by this implementation");
  } else if (opp.awards.length === 0) {
    console.log("  Awards: none");
  } else {
    console.log(`  Awards: ${opp.awards.map(award => award.title).join(", ")}`);
  }
}

main().catch(console.error);
