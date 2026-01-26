import { describe, it, expect } from "vitest";
import { z } from "zod";
import { withCustomFields } from "@/extensions";
import { OpportunityBaseSchema } from "@/schemas";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test schemas
// ############################################################################

// Simple schema with customFields for testing
const SimpleSchemaWithCustomFields = z.object({
  id: z.string(),
  name: z.string(),
  customFields: z.record(z.unknown()).nullish(),
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
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        {
          key: "category",
          fieldType: CustomFieldType.string,
          description: "Test category field",
        },
      ] as const);

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
      const ExtendedOppSchema = withCustomFields(OpportunityBaseSchema, [
        {
          key: "legacyId",
          fieldType: CustomFieldType.object,
          valueSchema: LegacyIdValueSchema,
          description: "Maps to the opportunity_id in the legacy system",
        },
      ] as const);

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
    it("should use default string schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "stringField", fieldType: CustomFieldType.string },
      ] as const);

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

    it("should use default number schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "numberField", fieldType: CustomFieldType.number },
      ] as const);

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

    it("should use default integer schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "integerField", fieldType: CustomFieldType.integer },
      ] as const);

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

    it("should use default boolean schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "boolField", fieldType: CustomFieldType.boolean },
      ] as const);

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

    it("should use default object schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "objectField", fieldType: CustomFieldType.object },
      ] as const);

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

    it("should use default array schema when valueSchema not provided", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "arrayField", fieldType: CustomFieldType.array },
      ] as const);

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
    it("should use provided valueSchema for validation", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        {
          key: "legacyId",
          fieldType: "object",
          valueSchema: LegacyIdValueSchema,
        },
      ] as const);

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
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        {
          key: "tags",
          fieldType: CustomFieldType.array,
          valueSchema: TagsValueSchema,
        },
      ] as const);

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
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "registered", fieldType: CustomFieldType.string },
      ] as const);

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
    it("should handle empty specs array", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [] as const);

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
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "category", fieldType: CustomFieldType.string },
      ] as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
      });

      expect(result.customFields).toBeUndefined();
    });

    it("should handle null customFields", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "category", fieldType: CustomFieldType.string },
      ] as const);

      const result = ExtendedSchema.parse({
        id: "123",
        name: "Test",
        customFields: null,
      });

      expect(result.customFields).toBeNull();
    });

    it("should validate fieldType literal on registered fields", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "stringField", fieldType: CustomFieldType.string },
      ] as const);

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
  });

  describe("multiple custom fields", () => {
    it("should handle multiple custom field specs", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "category", fieldType: CustomFieldType.string },
        { key: "priority", fieldType: CustomFieldType.integer },
        {
          key: "metadata",
          fieldType: CustomFieldType.object,
          valueSchema: z.object({ version: z.number() }),
        },
      ] as const);

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

  describe("using CustomFieldType constant", () => {
    it("should work with CustomFieldType enum constant", () => {
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        {
          key: "legacyId",
          fieldType: CustomFieldType.object,
          valueSchema: LegacyIdValueSchema,
        },
        {
          key: "category",
          fieldType: CustomFieldType.string,
        },
      ] as const);

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
      const ExtendedSchema = withCustomFields(SimpleSchemaWithCustomFields, [
        { key: "category", fieldType: "string" },
      ] as const);

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
