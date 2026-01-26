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
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "legacy", id: 12345 },
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);

      expect(result).toEqual({ system: "legacy", id: 12345 });
      expect(result?.id).toBe(12345);
      expect(result?.system).toBe("legacy");
    });

    it("should return undefined if customFields is null", () => {
      const result = getCustomFieldValue(null, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined if customFields is undefined", () => {
      const result = getCustomFieldValue(undefined, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined if the key doesn't exist", () => {
      const customFields = {
        otherField: {
          name: "otherField",
          fieldType: CustomFieldType.string,
          value: "test",
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should return undefined if the value fails validation", () => {
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "legacy" }, // missing required "id" field
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });
  });

  describe("type inference", () => {
    it("should correctly infer the return type from the schema", () => {
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: { system: "legacy", id: 12345 },
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);

      // TypeScript should infer: { system: string; id: number } | undefined
      expect(result?.id).toBe(12345);
      expect(result?.system).toBe("legacy");
    });

    it("should work with array schemas", () => {
      const customFields = {
        tags: {
          name: "tags",
          fieldType: CustomFieldType.array,
          value: ["tag1", "tag2", "tag3"],
        },
      };

      const result = getCustomFieldValue(customFields, "tags", TagsValueSchema);

      expect(result).toEqual(["tag1", "tag2", "tag3"]);
      expect(result?.[0]).toBe("tag1");
    });

    it("should work with primitive schemas", () => {
      const customFields = {
        count: {
          name: "count",
          fieldType: CustomFieldType.number,
          value: 42,
        },
      };

      const result = getCustomFieldValue(customFields, "count", z.number());

      expect(result).toBe(42);
    });

    it("should work with string schemas", () => {
      const customFields = {
        category: {
          name: "category",
          fieldType: CustomFieldType.string,
          value: "grants",
        },
      };

      const result = getCustomFieldValue(customFields, "category", z.string());

      expect(result).toBe("grants");
    });
  });

  describe("edge cases", () => {
    it("should handle empty customFields object", () => {
      const result = getCustomFieldValue({}, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should handle custom field with null value", () => {
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: null,
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should handle custom field with undefined value", () => {
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: undefined,
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });

    it("should handle invalid value type", () => {
      const customFields = {
        legacyId: {
          name: "legacyId",
          fieldType: CustomFieldType.object,
          value: "not an object", // wrong type
        },
      };

      const result = getCustomFieldValue(customFields, "legacyId", LegacyIdValueSchema);
      expect(result).toBeUndefined();
    });
  });
});
