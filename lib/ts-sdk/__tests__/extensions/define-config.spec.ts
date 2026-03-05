import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineConfig, mergeExtensions, type SchemaExtensions } from "@/extensions";
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
// defineConfig tests
// ############################################################################

describe("defineConfig", () => {
  // ############################################################################
  // Basic structure
  // ############################################################################

  describe("basic structure", () => {
    it("should return a PluginConfig with .extensions and .schemas", () => {
      const extensions = {
        Opportunity: {
          legacyId: { fieldType: CustomFieldType.string },
        },
      } as const;

      const config = defineConfig(extensions);

      expect(config).toHaveProperty("extensions");
      expect(config).toHaveProperty("schemas");
    });

    it("should preserve extensions input by reference on .extensions", () => {
      const extensions = {
        Opportunity: {
          legacyId: { fieldType: CustomFieldType.string },
        },
      } as const;

      const config = defineConfig(extensions);

      expect(config.extensions).toBe(extensions);
    });
  });

  // ############################################################################
  // Extensible schemas (Opportunity)
  // ############################################################################

  describe("extensible schemas", () => {
    it("should parse payloads with custom fields via config.schemas.Opportunity", () => {
      const config = defineConfig({
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
      } as const);

      const result = config.schemas.Opportunity.parse({
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
      const config = defineConfig({
        Opportunity: {
          legacyId: {
            fieldType: CustomFieldType.object,
            valueSchema: LegacyIdValueSchema,
          },
        },
      } as const);

      const result = config.schemas.Opportunity.safeParse({
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
      const config = defineConfig({});

      expect(config.schemas.Opportunity).toBe(OpportunityBaseSchema);
    });

    it("should return base Opportunity schema when specs are empty", () => {
      const config = defineConfig({ Opportunity: {} });

      expect(config.schemas.Opportunity).toBe(OpportunityBaseSchema);
    });
  });

  // ############################################################################
  // Plugin composition
  // ############################################################################

  describe("plugin composition", () => {
    it("should work with mergeExtensions for multi-plugin composition", () => {
      const pluginA = defineConfig({
        Opportunity: {
          legacyId: {
            fieldType: CustomFieldType.object,
            valueSchema: LegacyIdValueSchema,
          },
        },
      } as const);

      const pluginB = defineConfig({
        Opportunity: {
          category: {
            fieldType: CustomFieldType.string,
            description: "Grant category",
          },
        },
      } as const);

      const merged = mergeExtensions([pluginA.extensions, pluginB.extensions]);
      const combined = defineConfig(merged);

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
    it("should have the same shape as base PluginConfig", () => {
      const config = defineConfig({
        Opportunity: {
          legacyId: { fieldType: CustomFieldType.string },
        },
      } as const);

      // Verify PluginConfig<T> has the expected PluginConfig shape at runtime
      expect(config).toHaveProperty("extensions");
      expect(config).toHaveProperty("schemas");
      expect(typeof config.extensions).toBe("object");
      expect(typeof config.schemas).toBe("object");
    });

    it("should accept SchemaExtensions as input type", () => {
      const extensions: SchemaExtensions = {
        Opportunity: {
          category: { fieldType: "string" },
        },
      };

      const config = defineConfig(extensions);
      expect(config.schemas.Opportunity).toBeDefined();
    });
  });
});
