/**
 * Example script demonstrating how to search for opportunities.
 *
 * Run with: pnpm example:search <searchTerm>
 */

import { Client, Auth } from "../src/client";
import { OppStatusOptions } from "../src/constants";

const searchTerm = process.argv[2];

if (!searchTerm) {
  console.error("Usage: pnpm example:search <searchTerm>");
  process.exit(1);
}

const baseUrl = process.env.CG_BASE_URL ?? "http://localhost:8000";
const apiKey = process.env.CG_API_KEY ?? "<your-api-key>";

const client = new Client({
  baseUrl,
  auth: Auth.apiKey(apiKey),
  timeout: 5000,
  pageSize: 10,
});

async function main() {
  // Search with query and status filter
  const response = await client.opportunities.search({
    query: searchTerm,
    statuses: [OppStatusOptions.open],
    page: 1,
  });

  console.log(`Found ${response.items.length} opportunities:`);
  for (const opp of response.items) {
    console.log(`Opportunity ${opp.id}:`);
    console.log(`  Title: ${opp.title}`);
    console.log(`  ID: ${opp.id}`);
    console.log(`  Status: ${opp.status.value}`);
  }
}

main().catch(console.error);
