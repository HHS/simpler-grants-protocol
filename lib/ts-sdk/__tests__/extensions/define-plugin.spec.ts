import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildTransforms, definePlugin, type PluginMeta, type TransformResult } from "@/extensions";
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
    it("should return a Plugin with .schemas", () => {
      const plugin = definePlugin({
        schemas: {
          Opportunity: {
            customFields: {
              legacyId: { fieldType: CustomFieldType.string },
            },
          },
        },
      } as const);

      expect(plugin).toHaveProperty("schemas");
    });

    it("should preserve meta input by reference", () => {
      const extensions = { meta: { name: "test", sourceSystem: "test" } };

      const plugin = definePlugin({ extensions });

      expect(plugin.extensions).toBe(extensions);
    });
  });

  // ############################################################################
  // Extensible schemas (Opportunity)
  // ############################################################################

  describe("extensible schemas", () => {
    it("should parse payloads with custom fields via plugin.schemas.Opportunity.common", () => {
      const plugin = definePlugin({
        schemas: {
          Opportunity: {
            customFields: {
              legacyId: {
                fieldType: CustomFieldType.object,
                value: LegacyIdValueSchema,
              },
              category: {
                fieldType: CustomFieldType.string,
                description: "Grant category",
              },
            },
          },
        },
      } as const);

      const result = plugin.schemas.Opportunity.common.parse({
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
        schemas: {
          Opportunity: {
            customFields: {
              legacyId: {
                fieldType: CustomFieldType.object,
                value: LegacyIdValueSchema,
              },
            },
          },
        },
      } as const);

      const result = plugin.schemas.Opportunity.common.safeParse({
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
  // Empty schemas
  // ############################################################################

  describe("empty schemas", () => {
    it("should return base schema under .common when no customFields are provided", () => {
      const plugin = definePlugin({});

      expect(plugin.schemas.Opportunity.common).toBe(OpportunityBaseSchema);
    });

    it("should return base schema under .common when customFields is empty", () => {
      const plugin = definePlugin({
        schemas: { Opportunity: { customFields: {} } },
      });

      expect(plugin.schemas.Opportunity.common).toBe(OpportunityBaseSchema);
    });
  });

  // ############################################################################
  // Type compatibility
  // ############################################################################

  describe("type compatibility", () => {
    it("should have the expected Plugin shape at runtime", () => {
      const plugin = definePlugin({
        schemas: {
          Opportunity: {
            customFields: {
              legacyId: { fieldType: CustomFieldType.string },
            },
          },
        },
      } as const);

      expect(plugin).toHaveProperty("schemas");
      expect(typeof plugin.schemas).toBe("object");
    });
  });

  // ############################################################################
  // meta
  // ############################################################################

  describe("meta", () => {
    it("preserves meta on the returned plugin", () => {
      const meta: PluginMeta = {
        name: "grants.gov",
        version: "1.0.0",
        sourceSystem: "grants.gov",
        capabilities: ["customFields", "transforms"],
      };

      const plugin = definePlugin({ meta });

      expect(plugin.meta).toBe(meta);
    });

    it("leaves meta undefined when not provided", () => {
      const plugin = definePlugin({});

      expect(plugin.meta).toBeUndefined();
    });
  });

  // ############################################################################
  // schemas (transform callables)
  // ############################################################################

  describe("schemas (transforms)", () => {
    it("preserves toCommon and fromCommon on the returned plugin schemas", () => {
      const { toCommon, fromCommon } = buildTransforms(
        { title: { field: "data.opportunity_title" } },
        { data: { opportunity_title: { field: "title" } } }
      );

      const plugin = definePlugin({
        schemas: {
          Opportunity: { toCommon, fromCommon },
        },
      });

      expect(plugin.schemas.Opportunity.toCommon).toBe(toCommon);
      expect(plugin.schemas.Opportunity.fromCommon).toBe(fromCommon);
    });

    it("invokes the stored transform callable via plugin.schemas", () => {
      const { toCommon, fromCommon } = buildTransforms(
        { title: { field: "data.opportunity_title" } },
        { data: { opportunity_title: { field: "title" } } }
      );

      const plugin = definePlugin({
        schemas: {
          Opportunity: { toCommon, fromCommon },
        },
      });

      const out = plugin.schemas.Opportunity.toCommon?.({
        data: { opportunity_title: "Hello" },
      }) as TransformResult<{ title: string }>;

      expect(out.errors).toEqual([]);
      expect(out.result.title).toBe("Hello");
    });

    it("leaves toCommon and fromCommon undefined when not provided", () => {
      const plugin = definePlugin({});

      expect(plugin.schemas.Opportunity.toCommon).toBeUndefined();
      expect(plugin.schemas.Opportunity.fromCommon).toBeUndefined();
    });
  });

  // ############################################################################
  // schemas.customFields — single surface
  // ############################################################################

  describe("schemas.customFields (single surface)", () => {
    it("applies customFields from schemas[obj] to the compiled common schema", () => {
      const plugin = definePlugin({
        schemas: {
          Opportunity: {
            customFields: {
              legacyId: {
                fieldType: CustomFieldType.object,
                value: LegacyIdValueSchema,
              },
            },
          },
        },
      });

      const result = plugin.schemas.Opportunity.common.parse({
        ...validOpp,
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 42 },
          },
        },
      });

      const legacy = result.customFields?.legacyId?.value as { system: string; id: number };
      expect(legacy.system).toBe("legacy");
      expect(legacy.id).toBe(42);
    });

    it("works without a schemas argument at all", () => {
      const plugin = definePlugin({});

      expect(plugin.extensions).toBeUndefined();
      // Common schema defaults to base schema when no customFields provided.
      const result = plugin.schemas.Opportunity.common.parse(validOpp);
      expect(result.title).toBe("Test Opportunity");
    });
  });
});
