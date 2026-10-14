import { describe, it, expect } from "vitest";
import { z } from "zod";
import { withCustomFields } from "@/extensions";
import { AwdRecipientIndividualSchema, CustomFieldSchema, OpportunityBaseSchema } from "@/schemas";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test schemas
// ############################################################################

// Simple schema with customFields for testing
const SimpleSchemaWithCustomFields = z.object({
  id: z.string(),
  name: z.string(),
  customFields: z.record(z.string(), CustomFieldSchema).nullish(),
});

// Custom value schemas for testing
const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const TagsValueSchema = z.array(z.string());

// ############################################################################
// withCustomFields function tests
// ############################################################################

describe("withCustomFields", () => {
  // ############################################################################
  // Basic functionality
  // ############################################################################

  describe("basic functionality", () => {
    it("should extend a schema with typed custom fields", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: {
          fieldType: CustomFieldType.string,
          description: "Test category field",
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            name: "category",
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.id).toBe("123");
      expect(result.customFields?.category?.value).toBe("grants");
    });

    it("should work with OpportunityBaseSchema", () => {
      const ExtendedOppSchema = withCustomFields(OpportunityBaseSchema, {
        legacyId: {
          fieldType: CustomFieldType.object,
          value: LegacyIdValueSchema,
          description: "Maps to the opportunity_id in the legacy system",
        },
      } as const);

      const validOpp = {
        id: "573525f2-8e15-4405-83fb-e6523511d893",
        title: "Test Opportunity",
        status: { value: "open" },
        description: "A test opportunity",
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-01T00:00:00Z",
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 12345 },
          },
        },
      };

      const result = ExtendedOppSchema.parse(validOpp);
      expect(result.customFields?.legacyId?.value.system).toBe("legacy");
      expect(result.customFields?.legacyId?.value.id).toBe(12345);
    });
  });

  // ############################################################################
  // Default value schemas
  // ############################################################################

  describe("default value schemas", () => {
    it("should use default string schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        stringField: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          stringField: {
            name: "stringField",
            fieldType: "string",
            value: "hello",
          },
        },
      });

      expect(result.customFields?.stringField?.value).toBe("hello");
    });

    it("should use default number schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        numberField: { fieldType: CustomFieldType.number },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          numberField: {
            name: "numberField",
            fieldType: "number",
            value: 42.5,
          },
        },
      });

      expect(result.customFields?.numberField?.value).toBe(42.5);
    });

    it("should use default integer schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        integerField: { fieldType: CustomFieldType.integer },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          integerField: {
            name: "integerField",
            fieldType: "integer",
            value: 42,
          },
        },
      });

      expect(result.customFields?.integerField?.value).toBe(42);

      // Should fail for non-integer
      expect(() =>
        ExtendedSchema.parse({
          id: "123",
          name: "Test",
          customFields: {
            integerField: {
              name: "integerField",
              fieldType: "integer",
              value: 42.5,
            },
          },
        })
      ).toThrow();
    });

    it("should use default boolean schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        boolField: { fieldType: CustomFieldType.boolean },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          boolField: {
            name: "boolField",
            fieldType: "boolean",
            value: true,
          },
        },
      });

      expect(result.customFields?.boolField?.value).toBe(true);
    });

    it("should use default object schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        objectField: { fieldType: CustomFieldType.object },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          objectField: {
            name: "objectField",
            fieldType: "object",
            value: { foo: "bar", nested: { baz: 123 } },
          },
        },
      });

      expect(result.customFields?.objectField?.value).toEqual({
        foo: "bar",
        nested: { baz: 123 },
      });
    });

    it("should use default array schema when value not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        arrayField: { fieldType: CustomFieldType.array },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          arrayField: {
            name: "arrayField",
            fieldType: "array",
            value: [1, "two", { three: 3 }],
          },
        },
      });

      expect(result.customFields?.arrayField?.value).toEqual([1, "two", { three: 3 }]);
    });
  });

  // ############################################################################
  // Custom value schemas
  // ############################################################################

  describe("custom value schemas", () => {
    it("should use provided value for validation", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        legacyId: {
          fieldType: "object",
          value: LegacyIdValueSchema,
        },
      } as const);

      // Valid value
      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 42 },
          },
        },
      });

      expect(result.customFields?.legacyId?.value.system).toBe("legacy");
      expect(result.customFields?.legacyId?.value.id).toBe(42);

      // Invalid value - missing required field
      expect(() =>
        ExtendedSchema.parse({
          id: "123",
          name: "Test",
          customFields: {
            legacyId: {
              name: "legacyId",
              fieldType: "object",
              value: { system: "legacy" }, // missing id
            },
          },
        })
      ).toThrow();
    });

    it("should validate array value schema", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        tags: {
          fieldType: CustomFieldType.array,
          value: TagsValueSchema,
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          tags: {
            name: "tags",
            fieldType: "array",
            value: ["tag1", "tag2", "tag3"],
          },
        },
      });

      expect(result.customFields?.tags?.value).toEqual(["tag1", "tag2", "tag3"]);

      // Should fail if array contains non-strings
      expect(() =>
        ExtendedSchema.parse({
          id: "123",
          name: "Test",
          customFields: {
            tags: {
              name: "tags",
              fieldType: "array",
              value: ["tag1", 123, "tag3"],
            },
          },
        })
      ).toThrow();
    });
  });

  // ############################################################################
  // Passthrough for unregistered fields
  // ############################################################################

  describe("passthrough for unregistered fields", () => {
    it("should allow unregistered custom fields to pass through", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        registered: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          registered: {
            name: "registered",
            fieldType: "string",
            value: "registered value",
          },
          unregistered: {
            name: "unregistered",
            fieldType: "number",
            value: 42,
          },
        },
      });

      expect(result.customFields?.registered?.value).toBe("registered value");
      // Unregistered field should still be accessible
      expect((result.customFields as Record<string, unknown>)?.unregistered).toBeDefined();
    });
  });

  // ############################################################################
  // Edge cases
  // ############################################################################

  describe("edge cases", () => {
    it("should handle empty specs object", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {} as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          anyField: {
            name: "anyField",
            fieldType: "string",
            value: "test",
          },
        },
      });

      expect(result.id).toBe("123");
    });

    it("should handle missing customFields property", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
      });

      expect(result.customFields).toBeUndefined();
    });

    it("should handle null customFields", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: null,
      });

      expect(result.customFields).toBeNull();
    });

    it("should validate fieldType literal on registered fields", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        stringField: { fieldType: CustomFieldType.string },
      } as const);

      // Should fail if fieldType doesn't match
      expect(() =>
        ExtendedSchema.parse({
          id: "123",
          name: "Test",
          customFields: {
            stringField: {
              name: "stringField",
              fieldType: "number", // Wrong type!
              value: "hello",
            },
          },
        })
      ).toThrow();
    });

    it("should reject schemas without customFields at compile time", () => {
      const SimpleSchemaWithoutCustomFields = z.object({
        id: z.string(),
        name: z.string(),
      });

      expect(() =>
        // @ts-expect-error -- schema without customFields should not be accepted
        withCustomFields(SimpleSchemaWithoutCustomFields, {
          category: { fieldType: CustomFieldType.string },
        } as const)
      ).toThrow("Cannot register custom fields on a schema that doesn't support them");
    });
  });

  // ############################################################################
  // Multiple custom fields
  // ############################################################################

  describe("multiple custom fields", () => {
    it("should handle multiple custom field specs", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: CustomFieldType.string },
        priority: { fieldType: CustomFieldType.integer },
        metadata: {
          fieldType: CustomFieldType.object,
          value: z.object({ version: z.number() }),
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            name: "category",
            fieldType: "string",
            value: "grants",
          },
          priority: {
            name: "priority",
            fieldType: "integer",
            value: 1,
          },
          metadata: {
            name: "metadata",
            fieldType: "object",
            value: { version: 2 },
          },
        },
      });

      expect(result.customFields?.category?.value).toBe("grants");
      expect(result.customFields?.priority?.value).toBe(1);
      expect(result.customFields?.metadata?.value.version).toBe(2);
    });
  });

  // ############################################################################
  // Spec name and description defaults
  // ############################################################################

  describe("spec name and description defaults", () => {
    it("should use the record key as the default name when spec.name is not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.name).toBe("category");
    });

    it("should use spec.name as the default name when provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: {
          fieldType: CustomFieldType.string,
          name: "Grant Category",
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.name).toBe("Grant Category");
    });

    it("should allow input data to override the default name", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: {
          fieldType: CustomFieldType.string,
          name: "Grant Category",
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            name: "Custom Name Override",
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.name).toBe("Custom Name Override");
    });

    it("should leave description as nullish when spec.description is not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.description).toBeUndefined();
    });

    it("should use spec.description as the default when provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: {
          fieldType: CustomFieldType.string,
          description: "Grant category",
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.description).toBe("Grant category");
    });

    it("should allow input data to override the default description", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: {
          fieldType: CustomFieldType.string,
          description: "Grant category",
        },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            fieldType: "string",
            value: "grants",
            description: "Custom description override",
          },
        },
      });

      expect(result.customFields?.category?.description).toBe("Custom description override");
    });
  });

  // ############################################################################
  // Using CustomFieldType constant
  // ############################################################################

  describe("using CustomFieldType constant", () => {
    it("should work with CustomFieldType enum constant", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        legacyId: {
          fieldType: CustomFieldType.object,
          value: LegacyIdValueSchema,
        },
        category: { fieldType: CustomFieldType.string },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 42 },
          },
          category: {
            name: "category",
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.legacyId?.value.id).toBe(42);
      expect(result.customFields?.category?.value).toBe("grants");
    });

    it("should work with string literal fieldType", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, {
        category: { fieldType: "string" },
      } as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: {
          category: {
            name: "category",
            fieldType: "string",
            value: "grants",
          },
        },
      });

      expect(result.customFields?.category?.value).toBe("grants");
    });
  });
});

// ############################################################################
// Unregistered entries: preserved, validated as the base CustomField
// ############################################################################

const baseOpportunity = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "Test Opportunity",
  status: { value: "open" },
  description: "A test opportunity",
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};

// One entry per fieldType, an explicit null value, and keys in both casings.
// Each carries its own complete envelope; keys and nested values are kept as is.
const UNREGISTERED_ENTRIES = {
  vendorPayload: {
    name: "vendorPayload",
    fieldType: "object",
    value: { camelKey: [1, { snake_key: null }], nested: { deep: true } },
  },
  vendor_payload: { name: "vendor_payload", fieldType: "string", value: "snake-cased key" },
  reviewScore: { name: "reviewScore", fieldType: "number", value: 4.5 },
  seatCount: { name: "seatCount", fieldType: "integer", value: 3 },
  isPilot: { name: "isPilot", fieldType: "boolean", value: false },
  regions: { name: "regions", fieldType: "array", value: ["US-CA", { code: "US-NY" }] },
  clearedValue: {
    name: "clearedValue",
    fieldType: "string",
    value: null,
    description: "An explicit null value is still a valid entry",
    schema: "https://example.com/schemas/cleared.json",
  },
};

const MALFORMED_ENTRIES: Record<string, unknown> = {
  "missing name": { fieldType: "string", value: "x" },
  "missing fieldType": { name: "k", value: "x" },
  "legacy type key": { type: "string", value: "noop" },
  "missing value": { name: "k", fieldType: "string" },
  "invalid fieldType": { name: "k", fieldType: "text", value: "x" },
  "invalid schema URL": { name: "k", fieldType: "string", value: "x", schema: "not a url" },
  "scalar entry": "x",
  "list entry": [{ name: "k", fieldType: "string", value: "x" }],
  "null entry": null,
};

const legacyIdSpec = { legacyId: { fieldType: CustomFieldType.integer } } as const;
const registeredEntry = { name: "legacyId", fieldType: "integer", value: 42 };

interface CustomFieldsCase {
  label: string;
  schema: z.ZodType;
  base: Record<string, unknown>;
}

// The registered schemas must match their bases, which are the oracle.
const REGISTERED_CASES: CustomFieldsCase[] = [
  {
    label: "withCustomFields(OpportunityBaseSchema)",
    schema: withCustomFields(OpportunityBaseSchema, legacyIdSpec),
    base: baseOpportunity,
  },
  {
    label: "withCustomFields(AwdRecipientIndividualSchema)",
    schema: withCustomFields(AwdRecipientIndividualSchema, legacyIdSpec),
    base: {},
  },
];
const ALL_CASES: CustomFieldsCase[] = [
  { label: "OpportunityBaseSchema", schema: OpportunityBaseSchema, base: baseOpportunity },
  { label: "AwdRecipientIndividualSchema", schema: AwdRecipientIndividualSchema, base: {} },
  ...REGISTERED_CASES,
];

const issuePaths = (result: { success: boolean; error?: z.ZodError }) =>
  (result.error?.issues ?? []).map(issue => issue.path.slice(0, 2).join("."));

describe.each(ALL_CASES)("unregistered custom fields: $label", ({ schema, base }) => {
  it("preserves unregistered entries through a JSON round trip", () => {
    const customFields = { legacyId: registeredEntry, ...UNREGISTERED_ENTRIES };
    const input = { ...base, customFields };
    const before = structuredClone(input);

    const parsed = schema.parse(input);

    expect(input).toStrictEqual(before);
    const wire = JSON.parse(JSON.stringify(parsed));
    expect(wire.customFields).toStrictEqual(customFields);
    expect(schema.parse(wire)).toEqual(parsed);
  });

  it.each(Object.entries(MALFORMED_ENTRIES))("rejects an entry with %s", (_label, entry) => {
    const result = schema.safeParse({ ...base, customFields: { vendorPayload: entry } });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("customFields.vendorPayload");
  });
});

describe.each(REGISTERED_CASES)("registered custom fields: $label", ({ schema, base }) => {
  it("keeps validating registered entries with their own value schema", () => {
    const result = schema.safeParse({
      ...base,
      customFields: {
        legacyId: { ...registeredEntry, value: "not-an-int" },
        ...UNREGISTERED_ENTRIES,
      },
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["customFields.legacyId"]);
  });
});

describe("customFields container policy is inherited from the base", () => {
  const opportunity = withCustomFields(OpportunityBaseSchema, legacyIdSpec);
  const recipient = withCustomFields(AwdRecipientIndividualSchema, legacyIdSpec);

  it("keeps Opportunity customFields nullable and optional", () => {
    expect(opportunity.parse({ ...baseOpportunity, customFields: null }).customFields).toBeNull();
    expect(opportunity.parse(baseOpportunity).customFields).toBeUndefined();
  });

  it("keeps AwdRecipientIndividual customFields optional but not nullable", () => {
    expect(recipient.parse({}).customFields).toBeUndefined();
    expect(recipient.safeParse({ customFields: null }).success).toBe(false);
    expect(AwdRecipientIndividualSchema.safeParse({ customFields: null }).success).toBe(false);
  });
});
