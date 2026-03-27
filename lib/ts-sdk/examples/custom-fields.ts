/**
 * Example script demonstrating how to use custom fields with the SDK.
 *
 * This example shows how to:
 * 1. Extend a base schema with typed custom fields using withCustomFields()
 * 2. Parse data with custom fields
 * 3. Access typed custom field values via dot notation
 * 4. Extract and validate custom field values with getCustomFieldValue()
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
const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
  legacyId: {
    fieldType: CustomFieldType.object,
    value: LegacyIdValueSchema,
    description: "Maps to the opportunity_id in the legacy system",
  },
  tags: {
    fieldType: CustomFieldType.array,
    value: TagsValueSchema,
    description: "Tags for categorizing the opportunity",
  },
  category: {
    fieldType: CustomFieldType.string,
    description: "Grant category",
  },
  metadata: {
    fieldType: CustomFieldType.object,
    value: MetadataValueSchema,
    description: "Import metadata",
  },
} as const);

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

  // Step 2: Access typed values directly via dot notation
  // When you've already parsed data through the extended schema, custom field
  // values are fully typed and can be accessed directly.
  console.log("2. Direct access via dot notation:\n");

  const legacyId = opportunity.customFields?.legacyId?.value;
  if (legacyId) {
    console.log(`   legacyId.system: ${legacyId.system} (typed as string)`);
    console.log(`   legacyId.id:     ${legacyId.id} (typed as number)`);
  }

  const tags = opportunity.customFields?.tags?.value;
  if (tags) {
    console.log(`   tags: ${tags.join(", ")} (typed as string[])`);
  }

  const category = opportunity.customFields?.category?.value;
  console.log(`   category: ${category} (typed as string)`);

  const metadata = opportunity.customFields?.metadata?.value;
  if (metadata) {
    console.log(`   metadata.version:    ${metadata.version}`);
    console.log(`   metadata.source:     ${metadata.source}`);
    console.log(`   metadata.importedAt: ${metadata.importedAt}`);
  }

  // Step 3: Extract values with getCustomFieldValue()
  // Use this when you need to validate a value against a schema at runtime,
  // for example when working with data from external sources that may not
  // have been parsed through the extended schema.
  console.log("\n3. Extracting values with getCustomFieldValue():\n");

  const extractedLegacyId = getCustomFieldValue(opportunity, "legacyId", LegacyIdValueSchema);
  console.log(`   legacyId: ${JSON.stringify(extractedLegacyId)}`);

  const extractedTags = getCustomFieldValue(opportunity, "tags", TagsValueSchema);
  console.log(`   tags: ${extractedTags?.join(", ")}`);

  // Returns undefined for missing fields instead of throwing
  const missingField = getCustomFieldValue(opportunity, "nonexistent", z.string());
  console.log(`   nonexistent field: ${missingField ?? "undefined (safely handled)"}`);

  console.log("\n=== Example Complete ===");
}

main();
