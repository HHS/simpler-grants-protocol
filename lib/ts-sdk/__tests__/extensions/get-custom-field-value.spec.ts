import { describe, it, expect } from "vitest";
import { z } from "zod";
import { getCustomFieldValue } from "@/extensions";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test schemas
// ############################################################################

const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const TagsValueSchema = z.array(z.string());

// ############################################################################
// getCustomFieldValue tests
// ############################################################################

describe("getCustomFieldValue", () => {
  describe("basic functionality", () => {
    it("should extract and parse a valid custom field value", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: { system: "legacy", id: 12345 },
          },
        },
      };

      const result = getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema);

      expect(result).toEqual({ system: "legacy", id: 12345 });
      expect(result?.id).toBe(12345);
      expect(result?.system).toBe("legacy");
    });

    it("should return undefined if customFields is null", () => {
      const result = getCustomFieldValue({ customFields: null }, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined if customFields is undefined", () => {
      const result = getCustomFieldValue(
        { customFields: undefined },
        "legacyId",
        LegacyIdValueSchema
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined if the key doesn't exist", () => {
      const obj = {
        customFields: {
          otherField: {
            name: "otherField",
            fieldType: CustomFieldType.string,
            value: "test",
          },
        },
      };

      const result = getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should throw ZodError if the value fails validation", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: { system: "legacy" }, // missing required "id" field
          },
        },
      };

      expect(() => getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema)).toThrow();
    });
  });

  describe("type inference", () => {
    it("should correctly infer the return type from the schema", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: { system: "legacy", id: 12345 },
          },
        },
      };

      const result = getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema);

      // TypeScript should infer: { system: string; id: number } | undefined
      expect(result?.id).toBe(12345);
      expect(result?.system).toBe("legacy");
    });

    it("should work with array schemas", () => {
      const obj = {
        customFields: {
          tags: {
            name: "tags",
            fieldType: CustomFieldType.array,
            value: ["tag1", "tag2", "tag3"],
          },
        },
      };

      const result = getCustomFieldValue(obj, "tags", TagsValueSchema);

      expect(result).toEqual(["tag1", "tag2", "tag3"]);
      expect(result?.[0]).toBe("tag1");
    });

    it("should work with primitive schemas", () => {
      const obj = {
        customFields: {
          count: {
            name: "count",
            fieldType: CustomFieldType.number,
            value: 42,
          },
        },
      };

      const result = getCustomFieldValue(obj, "count", z.number());

      expect(result).toBe(42);
    });

    it("should work with string schemas", () => {
      const obj = {
        customFields: {
          category: {
            name: "category",
            fieldType: CustomFieldType.string,
            value: "grants",
          },
        },
      };

      const result = getCustomFieldValue(obj, "category", z.string());

      expect(result).toBe("grants");
    });
  });

  describe("edge cases", () => {
    it("should handle empty customFields object", () => {
      const result = getCustomFieldValue({ customFields: {} }, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined for custom field with null value", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: null,
          },
        },
      };

      const result = getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined for custom field with undefined value", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: undefined,
          },
        },
      };

      const result = getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should throw ZodError for invalid value type", () => {
      const obj = {
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: CustomFieldType.object,
            value: "not an object", // wrong type
          },
        },
      };

      expect(() => getCustomFieldValue(obj, "legacyId", LegacyIdValueSchema)).toThrow();
    });
  });
});
