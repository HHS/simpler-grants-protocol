/**
 * Example script demonstrating how to fetch a single opportunity by ID.
 *
 * Run with: pnpm example:get <oppId>
 */

import { Client, Auth } from "../src/client";

const oppId = process.argv[2];

if (!oppId) {
  console.error("Usage: pnpm example:get <oppId>");
  process.exit(1);
}

const client = new Client({
  baseUrl: "http://localhost:8000",
  auth: Auth.apiKey("two_orgs_user_key"),
  timeout: 5000,
});

async function main() {
  const opp = await client.opportunities.get(oppId);

  console.log(`Opportunity ${oppId}:`);
  console.log(`  Title: ${opp.title}`);
  console.log(`  ID: ${opp.id}`);
  console.log(`  Status: ${opp.status.value}`);
}

main().catch(console.error);
