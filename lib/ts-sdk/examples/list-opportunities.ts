/**
 * Example script demonstrating how to list opportunities.
 *
 * Run with: pnpm example:list
 */

import { Client, Auth } from "../src/client";

const client = new Client({
  baseUrl: "http://localhost:8000",
  auth: Auth.apiKey("two_orgs_user_key"),
  timeout: 5000,
  pageSize: 10,
});

async function main() {
  // Fetch a single page
  const response = await client.opportunities.list({ maxItems: 25, pageSize: 5 });

  console.log(`Found ${response.paginationInfo.pageSize} opportunities:`);
  for (const opp of response.items) {
    console.log(`Opportunity ${opp.id}:`);
    console.log(`  Title: ${opp.title}`);
    console.log(`  ID: ${opp.id}`);
    console.log(`  Status: ${opp.status.value}`);
  }
}

main().catch(console.error);
