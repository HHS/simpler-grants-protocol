import { describe, it, expect } from "vitest";
import { z } from "zod";
import { withCustomFields, getCustomFieldValue, definePlugin, mergeExtensions } from "@/extensions";
import { OpportunityBaseSchema } from "@/schemas";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test schemas
// ############################################################################

// Custom value schemas for testing
const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const TagsValueSchema = z.array(z.string());

const MetadataValueSchema = z.object({
  version: z.number(),
  source: z.string(),
});

// ############################################################################
// Integration tests
// ############################################################################

describe("withCustomFields + getCustomFieldValue integration", () => {
  it("should work together to create typed schemas and extract values", () => {
    // Step 1: Create an extended schema with typed custom fields
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
    } as const);

    // Step 2: Parse data using the extended schema
    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity with custom fields",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      customFields: {
        legacyId: {
          name: "legacyId",
          fieldType: "object",
          value: { system: "legacy", id: 12345 },
        },
        tags: {
          name: "tags",
          fieldType: "array",
          value: ["grants", "education", "nonprofit"],
        },
        category: {
          name: "category",
          fieldType: "string",
          value: "STEM Education",
        },
        // Unregistered field - should still pass through
        unregistered: {
          name: "unregistered",
          fieldType: "string",
          value: "some value",
        },
      },
    };

    const parsed = OpportunitySchema.parse(opportunityData);

    // Step 3: Extract and use typed custom field values
    const legacyId = getCustomFieldValue(parsed, "legacyId", LegacyIdValueSchema);
    const tags = getCustomFieldValue(parsed, "tags", TagsValueSchema);
    const category = getCustomFieldValue(parsed, "category", z.string());

    // Verify typed access works
    expect(legacyId).toEqual({ system: "legacy", id: 12345 });
    expect(legacyId?.id).toBe(12345); // Typed as number
    expect(legacyId?.system).toBe("legacy"); // Typed as string

    expect(tags).toEqual(["grants", "education", "nonprofit"]);
    expect(tags?.[0]).toBe("grants"); // Typed as string[]

    expect(category).toBe("STEM Education"); // Typed as string
  });

  it("should handle missing custom fields gracefully", () => {
    const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
      legacyId: {
        fieldType: CustomFieldType.object,
        value: LegacyIdValueSchema,
      },
    } as const);

    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      // No customFields
    };

    const parsed = OpportunitySchema.parse(opportunityData);

    // Should return undefined for missing field
    const legacyId = getCustomFieldValue(parsed, "legacyId", LegacyIdValueSchema);
    expect(legacyId).toBeUndefined();
  });

  it("should reject invalid custom field values during parsing", () => {
    const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
      legacyId: {
        fieldType: CustomFieldType.object,
        value: LegacyIdValueSchema,
      },
    } as const);

    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      customFields: {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "legacy" }, // Missing required "id" field
        },
      },
    };

    // Invalid values should cause parsing to fail
    const result = OpportunitySchema.safeParse(opportunityData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("customFields");
      expect(result.error.issues[0].path).toContain("legacyId");
      expect(result.error.issues[0].path).toContain("value");
    }
  });

  it("should throw ZodError when getCustomFieldValue receives invalid data", () => {
    // This test demonstrates that getCustomFieldValue throws an error
    // when values don't match the schema (e.g., from external sources)
    const customFields = {
      legacyId: {
        name: "legacyId",
        fieldType: CustomFieldType.object,
        value: { system: "legacy" }, // Missing required "id" field
      },
    };

    // getCustomFieldValue should throw ZodError for invalid values
    expect(() => getCustomFieldValue({ customFields }, "legacyId", LegacyIdValueSchema)).toThrow();
  });

  it("should work with default value schemas (no value provided)", () => {
    const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
      category: {
        fieldType: CustomFieldType.string, // No value - uses default z.string()
      },
      priority: {
        fieldType: CustomFieldType.integer, // No value - uses default z.number().int()
      },
    } as const);

    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      customFields: {
        category: {
          name: "category",
          fieldType: CustomFieldType.string,
          value: "STEM",
        },
        priority: {
          name: "priority",
          fieldType: CustomFieldType.integer,
          value: 5,
        },
      },
    };

    const parsed = OpportunitySchema.parse(opportunityData);

    // Extract using the default schemas
    const category = getCustomFieldValue(parsed, "category", z.string());
    const priority = getCustomFieldValue(parsed, "priority", z.number().int());

    expect(category).toBe("STEM");
    expect(priority).toBe(5);
  });

  it("should handle complex nested custom fields", () => {
    const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
      metadata: {
        fieldType: CustomFieldType.object,
        value: MetadataValueSchema,
      },
    } as const);

    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      customFields: {
        metadata: {
          name: "metadata",
          fieldType: CustomFieldType.object,
          value: { version: 2, source: "api" },
        },
      },
    };

    const parsed = OpportunitySchema.parse(opportunityData);

    const metadata = getCustomFieldValue(parsed, "metadata", MetadataValueSchema);

    expect(metadata).toEqual({ version: 2, source: "api" });
    expect(metadata?.version).toBe(2); // Typed as number
    expect(metadata?.source).toBe("api"); // Typed as string
  });

  it("should maintain type safety throughout the workflow", () => {
    const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
      legacyId: {
        fieldType: CustomFieldType.object,
        value: LegacyIdValueSchema,
      },
    } as const);

    const opportunityData = {
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opportunity",
      status: { value: "open" },
      description: "A test opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
      customFields: {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "legacy", id: 12345 },
        },
      },
    };

    const parsed = OpportunitySchema.parse(opportunityData);

    // TypeScript should infer the correct types
    type Opportunity = z.infer<typeof OpportunitySchema>;
    const opp: Opportunity = parsed;

    // Typed access through the schema
    const legacyIdFromSchema = opp.customFields?.legacyId?.value;
    // legacyIdFromSchema is typed based on the schema definition

    // Typed access through getCustomFieldValue
    const legacyIdFromHelper = getCustomFieldValue(opp, "legacyId", LegacyIdValueSchema);
    // legacyIdFromHelper: { system: string; id: number } | undefined

    expect(legacyIdFromHelper).toEqual({ system: "legacy", id: 12345 });
    expect(legacyIdFromHelper?.id).toBe(12345);
    expect(legacyIdFromSchema).toEqual(legacyIdFromHelper);
  });
});

// ############################################################################
// Plugin composition integration tests
// ############################################################################

describe("plugin composition", () => {
  // Shared test data
  const validOpp = {
    id: "573525f2-8e15-4405-83fb-e6523511d893",
    title: "Test Opportunity",
    status: { value: "open" },
    description: "A test opportunity with custom fields",
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2025-01-01T00:00:00Z",
  };

  // Plugin 1: Legacy System — adds legacyId (object with system + id)
  const legacyPlugin = definePlugin({
    extensions: {
      Opportunity: {
        legacyId: {
          fieldType: CustomFieldType.object,
          value: LegacyIdValueSchema,
          description: "Maps to the opportunity_id in the legacy system",
        },
      },
    },
  } as const);

  // Plugin 2: Classification — adds category (string) and priority (integer)
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

  it("should parse custom fields from standalone plugins", () => {
    // Legacy plugin parses its own field
    const legacyData = {
      ...validOpp,
      customFields: {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "grants-v1", id: 42 },
        },
      },
    };
    const legacyResult = legacyPlugin.schemas.Opportunity.parse(legacyData);
    const legacyId = getCustomFieldValue(legacyResult, "legacyId", LegacyIdValueSchema);
    expect(legacyId).toEqual({ system: "grants-v1", id: 42 });

    // Classification plugin parses its own fields
    const classificationData = {
      ...validOpp,
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
    };
    const classResult = classificationPlugin.schemas.Opportunity.parse(classificationData);
    const category = getCustomFieldValue(classResult, "category", z.string());
    const priority = getCustomFieldValue(classResult, "priority", z.number().int());
    expect(category).toBe("STEM Education");
    expect(priority).toBe(1);
  });

  it("should merge extensions from multiple plugins without conflict", () => {
    const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);

    // All three fields should be present under Opportunity
    expect(merged.Opportunity).toBeDefined();
    expect(Object.keys(merged.Opportunity!)).toEqual(
      expect.arrayContaining(["legacyId", "category", "priority"])
    );
    expect(Object.keys(merged.Opportunity!)).toHaveLength(3);
  });

  it("should parse a payload with all custom fields from the combined plugin", () => {
    const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);
    const combinedPlugin = definePlugin({ extensions: merged });

    const fullData = {
      ...validOpp,
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
    };

    const parsed = combinedPlugin.schemas.Opportunity.parse(fullData);

    // Extract all custom field values
    const legacyId = parsed.customFields?.legacyId?.value;
    const category = parsed.customFields?.category?.value;
    const priority = parsed.customFields?.priority?.value;

    // Check typed access to values works
    expect(legacyId?.system).toBe("grants-v1");
    expect(legacyId?.id).toBe(42);
    expect(category).toBe("STEM Education");
    expect(priority).toBe(1);
  });

  it("should reject invalid data in the combined schema", () => {
    const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);
    const combinedPlugin = definePlugin({ extensions: merged });

    const invalidData = {
      ...validOpp,
      customFields: {
        priority: {
          name: "priority",
          fieldType: CustomFieldType.integer,
          value: "not-a-number", // Should be an integer
        },
      },
    };

    const result = combinedPlugin.schemas.Opportunity.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("customFields");
      expect(result.error.issues[0].path).toContain("priority");
      expect(result.error.issues[0].path).toContain("value");
    }
  });
});
