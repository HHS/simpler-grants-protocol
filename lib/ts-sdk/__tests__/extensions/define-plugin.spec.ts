import { describe, it, expect } from "vitest";
import { z } from "zod";
import { definePlugin, mergeExtensions, type SchemaExtensions } from "@/extensions";
import { OpportunityBaseSchema } from "@/schemas/zod/models";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test helpers
// ############################################################################

const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const validOpp = {
  id: "573525f2-8e15-4405-83fb-e6523511d893",
  title: "Test Opportunity",
  status: { value: "open" },
  description: "A test opportunity",
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};

// ############################################################################
// definePlugin tests
// ############################################################################

describe("definePlugin", () => {
  // ############################################################################
  // Basic structure
  // ############################################################################

  describe("basic structure", () => {
    it("should return a Plugin with .extensions and .schemas", () => {
      const extensions = {
        Opportunity: {
          legacyId: { fieldType: CustomFieldType.string },
        },
      } as const;

      const plugin = definePlugin({ extensions });

      expect(plugin).toHaveProperty("extensions");
      expect(plugin).toHaveProperty("schemas");
    });

    it("should preserve extensions input by reference on .extensions", () => {
      const extensions = {
        Opportunity: {
          legacyId: { fieldType: CustomFieldType.string },
        },
      } as const;

      const plugin = definePlugin({ extensions });

      expect(plugin.extensions).toBe(extensions);
    });
  });

  // ############################################################################
  // Extensible schemas (Opportunity)
  // ############################################################################

  describe("extensible schemas", () => {
    it("should parse payloads with custom fields via plugin.schemas.Opportunity", () => {
      const plugin = definePlugin({
        extensions: {
          Opportunity: {
            legacyId: {
              fieldType: CustomFieldType.object,
              valueSchema: LegacyIdValueSchema,
            },
            category: {
              fieldType: CustomFieldType.string,
              description: "Grant category",
            },
          },
        },
      } as const);

      const result = plugin.schemas.Opportunity.parse({
        ...validOpp,
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 42 },
          },
          category: {
            name: "category",
            fieldType: "string",
            value: "STEM",
          },
        },
      });

      expect(result.customFields?.legacyId?.value.system).toBe("legacy");
      expect(result.customFields?.legacyId?.value.id).toBe(42);
      expect(result.customFields?.category?.value).toBe("STEM");
    });

    it("should reject invalid custom field values via safeParse", () => {
      const plugin = definePlugin({
        extensions: {
          Opportunity: {
            legacyId: {
              fieldType: CustomFieldType.object,
              valueSchema: LegacyIdValueSchema,
            },
          },
        },
      } as const);

      const result = plugin.schemas.Opportunity.safeParse({
        ...validOpp,
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy" }, // missing id
          },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  // ############################################################################
  // Empty extensions
  // ############################################################################

  describe("empty extensions", () => {
    it("should return base schemas when extensions is {}", () => {
      const plugin = definePlugin({ extensions: {} });

      expect(plugin.schemas.Opportunity).toBe(OpportunityBaseSchema);
    });

    it("should return base Opportunity schema when specs are empty", () => {
      const plugin = definePlugin({ extensions: { Opportunity: {} } });

      expect(plugin.schemas.Opportunity).toBe(OpportunityBaseSchema);
    });
  });

  // ############################################################################
  // Plugin composition
  // ############################################################################

  describe("plugin composition", () => {
    it("should work with mergeExtensions for multi-plugin composition", () => {
      const pluginA = definePlugin({
        extensions: {
          Opportunity: {
            legacyId: {
              fieldType: CustomFieldType.object,
              valueSchema: LegacyIdValueSchema,
            },
          },
        },
      } as const);

      const pluginB = definePlugin({
        extensions: {
          Opportunity: {
            category: {
              fieldType: CustomFieldType.string,
              description: "Grant category",
            },
          },
        },
      } as const);

      const merged = mergeExtensions([pluginA.extensions, pluginB.extensions]);
      const combined = definePlugin({ extensions: merged });

      const result = combined.schemas.Opportunity.parse({
        ...validOpp,
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 99 },
          },
          category: {
            name: "category",
            fieldType: "string",
            value: "Education",
          },
        },
      });

      expect(result.customFields?.legacyId).toBeDefined();
      expect(result.customFields?.category).toBeDefined();
    });
  });

  // ############################################################################
  // Type compatibility
  // ############################################################################

  describe("type compatibility", () => {
    it("should have the same shape as base Plugin", () => {
      const plugin = definePlugin({
        extensions: {
          Opportunity: {
            legacyId: { fieldType: CustomFieldType.string },
          },
        },
      } as const);

      // Verify Plugin<T> has the expected Plugin shape at runtime
      expect(plugin).toHaveProperty("extensions");
      expect(plugin).toHaveProperty("schemas");
      expect(typeof plugin.extensions).toBe("object");
      expect(typeof plugin.schemas).toBe("object");
    });

    it("should accept SchemaExtensions as input type", () => {
      const extensions: SchemaExtensions = {
        Opportunity: {
          category: { fieldType: "string" },
        },
      };

      const plugin = definePlugin({ extensions });
      expect(plugin.schemas.Opportunity).toBeDefined();
    });
  });
});
