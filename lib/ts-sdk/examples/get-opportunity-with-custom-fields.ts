/**
 * Example: parse custom fields from API responses.
 *
 * Two modes:
 *  1. Parse inline mock (no API): pnpm example:get-custom-fields
 *  2. Fetch from API: pnpm example:get-custom-fields <oppId>
 */

import { z } from "zod";
import { OpportunityBaseSchema, OkSchema } from "../src/schemas";
import { CustomFieldType } from "../src/constants";
import { withCustomFields } from "../src/extensions";
import { Client, Auth } from "../src/client";

// Extended schema with one typed custom field (e.g. from your API)
const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
  legacyId: {
    fieldType: CustomFieldType.integer,
    valueSchema: z.number().int(),
    description: "Legacy system opportunity ID",
  },
} as const);

const ResponseSchema = OkSchema(OpportunitySchema);

// Mock API response shape (same as GET /common-grants/opportunities/:id)
const MOCK_OPPORTUNITY_RESPONSE = {
  status: 200,
  message: "Success",
  data: {
    id: "573525f2-8e15-4405-83fb-e6523511d893",
    title: "STEM Education Grant Program",
    description: "A grant program focused on improving STEM education.",
    status: { value: "open" },
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2025-01-15T00:00:00Z",
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: "integer",
        value: 12345,
        description: "Legacy system opportunity ID",
      },
    },
  },
};

function parseMockResponse() {
  const parsed = ResponseSchema.parse(MOCK_OPPORTUNITY_RESPONSE);
  return parsed.data;
}

async function fetchFromApi(oppId: string) {
  const baseUrl = process.env.CG_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.CG_API_KEY ?? "<your-api-key>";

  const client = new Client({
    baseUrl,
    auth: Auth.apiKey(apiKey),
    timeout: 5000,
  });

  return client.opportunities.get(oppId, OpportunitySchema);
}

function printOpportunity(opp: z.infer<typeof OpportunitySchema>) {
  console.log("Opportunity:");
  console.log(`  id: ${opp.id}`);
  console.log(`  title: ${opp.title}`);
  console.log(`  status: ${opp.status.value}`);
  if (opp.customFields?.legacyId != null) {
    console.log(
      `  customFields.legacyId.value: ${opp.customFields.legacyId.value} (typed as number)`
    );
  } else {
    console.log("  customFields.legacyId: (not present)");
  }
}

async function main() {
  const oppId = process.argv[2];

  if (!oppId) {
    console.log("Parsing mock API response (no server required)...\n");
    const opp = parseMockResponse();
    printOpportunity(opp);
    return;
  }

  console.log(`Fetching opportunity ${oppId} with custom schema...\n`);
  const opp = await fetchFromApi(oppId);
  printOpportunity(opp);
}

main().catch(console.error);
