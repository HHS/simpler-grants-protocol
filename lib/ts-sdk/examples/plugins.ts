/**
 * Example script demonstrating the plugin framework.
 *
 * This example shows how to:
 * 1. Define independent plugins with definePlugin()
 * 2. Use a standalone plugin's typed schemas
 * 3. Compose plugins with mergeExtensions()
 * 4. Access typed custom fields from the combined schema
 *
 * Run with: pnpm example:plugins
 */

import { z } from "zod";
import { CustomFieldType } from "../src/constants";
import { definePlugin, mergeExtensions } from "../src/extensions";

// ############################################################################
// Step 1: Define independent plugins
// ############################################################################

// Plugin for backward compatibility with a legacy grants system
const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const legacyPlugin = definePlugin({
  extensions: {
    Opportunity: {
      legacyId: {
        fieldType: CustomFieldType.object,
        valueSchema: LegacyIdValueSchema,
        description: "Maps to the opportunity_id in the legacy system",
      },
    },
  },
} as const);

// Plugin for grant categorization
const classificationPlugin = definePlugin({
  extensions: {
    Opportunity: {
      category: {
        fieldType: CustomFieldType.string,
        description: "Grant category",
      },
      priority: {
        fieldType: CustomFieldType.integer,
        description: "Processing priority (1 = highest)",
      },
    },
  },
} as const);

// ############################################################################
// Step 2: Use standalone plugins
// ############################################################################

// Sample data shared by all examples
const baseData = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "STEM Education Grant Program",
  description: "A grant program focused on STEM education in underserved communities",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-15T00:00:00Z",
};

function demonstrateStandalonePlugins() {
  console.log("--- Standalone plugins ---\n");

  // Legacy plugin schema validates and types its own fields
  const legacyOpp = legacyPlugin.schemas.Opportunity.parse({
    ...baseData,
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: CustomFieldType.object,
        value: { system: "grants-v1", id: 42 },
      },
    },
  });

  // Direct typed access — no helper needed
  const legacyId = legacyOpp.customFields?.legacyId?.value;
  console.log(`  legacyId.system: ${legacyId?.system}`);
  console.log(`  legacyId.id:     ${legacyId?.id} (typed as number)\n`);

  // Classification plugin schema validates its fields
  const classOpp = classificationPlugin.schemas.Opportunity.parse({
    ...baseData,
    customFields: {
      category: {
        name: "category",
        fieldType: CustomFieldType.string,
        value: "STEM Education",
      },
      priority: {
        name: "priority",
        fieldType: CustomFieldType.integer,
        value: 1,
      },
    },
  });

  console.log(`  category: ${classOpp.customFields?.category?.value} (typed as string)`);
  console.log(`  priority: ${classOpp.customFields?.priority?.value} (typed as number)`);
}

// ############################################################################
// Step 3: Compose plugins
// ############################################################################

function demonstrateComposition() {
  console.log("\n--- Composed plugins ---\n");

  // Merge extensions from both plugins into one
  const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);

  // Build a combined plugin with all custom fields
  const combinedPlugin = definePlugin({ extensions: merged });

  // Parse data with all custom fields
  const opportunity = combinedPlugin.schemas.Opportunity.parse({
    ...baseData,
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: CustomFieldType.object,
        value: { system: "grants-v1", id: 42 },
      },
      category: {
        name: "category",
        fieldType: CustomFieldType.string,
        value: "STEM Education",
      },
      priority: {
        name: "priority",
        fieldType: CustomFieldType.integer,
        value: 1,
      },
    },
  });

  // All fields are accessible with full type safety
  console.log(`  ${opportunity.title}\n`);
  console.log(`  legacyId.system: ${opportunity.customFields?.legacyId?.value.system}`);
  console.log(`  legacyId.id:     ${opportunity.customFields?.legacyId?.value.id}`);
  console.log(`  category:        ${opportunity.customFields?.category?.value}`);
  console.log(`  priority:        ${opportunity.customFields?.priority?.value}`);
}

// ############################################################################
// Step 4: Demonstrate validation
// ############################################################################

function demonstrateValidation() {
  console.log("\n--- Validation ---\n");

  const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);
  const combinedPlugin = definePlugin({ extensions: merged });

  // Invalid data: priority should be an integer, not a string
  const result = combinedPlugin.schemas.Opportunity.safeParse({
    ...baseData,
    customFields: {
      priority: {
        name: "priority",
        fieldType: CustomFieldType.integer,
        value: "not-a-number",
      },
    },
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    console.log(`  Validation failed (as expected):`);
    console.log(`    Path:    ${issue.path.join(".")}`);
    console.log(`    Message: ${issue.message}`);
  }
}

// ############################################################################
// Run
// ############################################################################

function main() {
  console.log("=== Plugins Example ===\n");
  demonstrateStandalonePlugins();
  demonstrateComposition();
  demonstrateValidation();
  console.log("\n=== Example Complete ===");
}

main();
