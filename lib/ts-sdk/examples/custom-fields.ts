/**
 * Example script demonstrating how to use custom fields with the SDK.
 *
 * This example shows how to:
 * 1. Extend a base schema with typed custom fields using withCustomFields()
 * 2. Parse data with custom fields
 * 3. Extract and use typed custom field values with getCustomFieldValue()
 *
 * Run with: pnpm example:custom-fields
 */

import { z } from "zod";
import { OpportunityBaseSchema } from "../src/schemas";
import { CustomFieldType } from "../src/constants";
import { withCustomFields, getCustomFieldValue } from "../src/extensions";

// Define custom value schemas for complex types
const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const TagsValueSchema = z.array(z.string());

const MetadataValueSchema = z.object({
  version: z.number(),
  source: z.string(),
  importedAt: z.string().datetime(),
});

// Create an extended schema with typed custom fields
const OpportunitySchema = withCustomFields(OpportunityBaseSchema, [
  {
    key: "legacyId",
    fieldType: CustomFieldType.object,
    valueSchema: LegacyIdValueSchema,
    description: "Maps to the opportunity_id in the legacy system",
  },
  {
    key: "tags",
    fieldType: CustomFieldType.array,
    valueSchema: TagsValueSchema,
    description: "Tags for categorizing the opportunity",
  },
  {
    key: "category",
    fieldType: CustomFieldType.string,
    description: "Grant category",
  },
  {
    key: "metadata",
    fieldType: CustomFieldType.object,
    valueSchema: MetadataValueSchema,
    description: "Import metadata",
  },
] as const);

// Sample opportunity data with custom fields
const opportunityData = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  description: "A grant program focused on improving STEM education in underserved communities",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
  customFields: {
    legacyId: {
      name: "legacyId",
      fieldType: CustomFieldType.object,
      value: { system: "legacy-crm", id: 12345 },
    },
    tags: {
      name: "tags",
      fieldType: CustomFieldType.array,
      value: ["education", "STEM", "nonprofit", "youth"],
    },
    category: {
      name: "category",
      fieldType: CustomFieldType.string,
      value: "Education",
    },
    metadata: {
      name: "metadata",
      fieldType: CustomFieldType.object,
      value: {
        version: 2,
        source: "api-import",
        importedAt: "2025-01-01T10:00:00Z",
      },
    },
    // Unregistered field - will pass through but won't have typed access
    unregistered: {
      name: "unregistered",
      fieldType: CustomFieldType.string,
      value: "some value",
    },
  },
};

function main() {
  console.log("=== Custom Fields Example ===\n");

  // Step 1: Parse the data using the extended schema
  console.log("1. Parsing opportunity data with custom fields...");
  const opportunity = OpportunitySchema.parse(opportunityData);
  console.log(`   ✓ Parsed: ${opportunity.title}\n`);

  // Step 2: Extract typed custom field values
  console.log("2. Extracting typed custom field values:\n");

  // Extract legacyId - typed as { system: string; id: number } | undefined
  const legacyId = getCustomFieldValue(opportunity.customFields, "legacyId", LegacyIdValueSchema);
  if (legacyId) {
    console.log(`   legacyId:`);
    console.log(`     System: ${legacyId.system}`);
    console.log(`     ID: ${legacyId.id} (typed as number)`);
  }

  // Extract tags - typed as string[] | undefined
  const tags = getCustomFieldValue(opportunity.customFields, "tags", TagsValueSchema);
  if (tags) {
    console.log(`   tags: ${tags.join(", ")} (typed as string[])`);
  }

  // Extract category - typed as string | undefined
  const category = getCustomFieldValue(opportunity.customFields, "category", z.string());
  if (category) {
    console.log(`   category: ${category} (typed as string)`);
  }

  // Extract metadata - typed as MetadataValueSchema | undefined
  const metadata = getCustomFieldValue(opportunity.customFields, "metadata", MetadataValueSchema);
  if (metadata) {
    console.log(`   metadata:`);
    console.log(`     Version: ${metadata.version}`);
    console.log(`     Source: ${metadata.source}`);
    console.log(`     Imported: ${metadata.importedAt}`);
  }

  // Step 3: Demonstrate type safety
  console.log("\n3. Type safety demonstration:");
  console.log("   ✓ TypeScript knows legacyId.id is a number");
  console.log("   ✓ TypeScript knows tags is a string[]");
  console.log("   ✓ TypeScript knows category is a string");
  console.log("   ✓ TypeScript knows metadata.version is a number");

  // Step 4: Handle missing fields
  console.log("\n4. Handling missing fields:");
  const missingField = getCustomFieldValue(opportunity.customFields, "nonexistent", z.string());
  console.log(`   nonexistent field: ${missingField ?? "undefined (safely handled)"}`);

  console.log("\n=== Example Complete ===");
}

main();
