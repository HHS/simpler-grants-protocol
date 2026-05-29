import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  buildTransforms,
  definePlugin,
  mergeExtensions,
  type PluginMeta,
  type SchemaExtensions,
  type TransformResult,
} from "@/extensions";
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
              value: LegacyIdValueSchema,
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
              value: LegacyIdValueSchema,
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
              value: LegacyIdValueSchema,
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

      // Non-null assertions: extensions on the returned Plugin is typed
      // optional (since `DefinePluginOptions.extensions` is optional in the
      // consolidated shape), but both pluginA and pluginB declared it above.
      const merged = mergeExtensions([pluginA.extensions!, pluginB.extensions!]);
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

  // ############################################################################
  // ADR-0022 — meta and transformSchemas (PoC additions)
  // ############################################################################

  describe("meta", () => {
    it("preserves meta on the returned plugin", () => {
      const meta: PluginMeta = {
        name: "grants.gov",
        version: "1.0.0",
        sourceSystem: "grants.gov",
        capabilities: ["customFields", "transforms"],
      };

      const plugin = definePlugin({ extensions: {}, meta });

      expect(plugin.meta).toBe(meta);
    });

    it("leaves meta undefined when not provided (backward compatibility)", () => {
      const plugin = definePlugin({ extensions: {} });

      expect(plugin.meta).toBeUndefined();
    });
  });

  describe("transformSchemas", () => {
    it("preserves transformSchemas on the returned plugin", () => {
      const { toCommon, fromCommon } = buildTransforms({
        toCommonMapping: { title: { field: "data.opportunity_title" } },
        fromCommonMapping: { data: { opportunity_title: { field: "title" } } },
      });

      const plugin = definePlugin({
        extensions: {},
        transformSchemas: {
          Opportunity: { toCommon, fromCommon },
        },
      });

      expect(plugin.transformSchemas?.Opportunity?.toCommon).toBe(toCommon);
      expect(plugin.transformSchemas?.Opportunity?.fromCommon).toBe(fromCommon);
    });

    it("invokes the stored transform callable via plugin.transformSchemas", () => {
      const { toCommon, fromCommon } = buildTransforms({
        toCommonMapping: { title: { field: "data.opportunity_title" } },
        fromCommonMapping: { data: { opportunity_title: { field: "title" } } },
      });

      const plugin = definePlugin({
        extensions: {},
        transformSchemas: {
          Opportunity: { toCommon, fromCommon },
        },
      });

      const out = plugin.transformSchemas?.Opportunity?.toCommon?.({
        data: { opportunity_title: "Hello" },
      }) as TransformResult<{ title: string }>;

      expect(out.errors).toEqual([]);
      expect(out.result.title).toBe("Hello");
    });

    it("leaves transformSchemas undefined when not provided (backward compatibility)", () => {
      const plugin = definePlugin({ extensions: {} });

      expect(plugin.transformSchemas).toBeUndefined();
    });
  });

  // ############################################################################
  // Consolidation (pending ADR-0022 amendment) — customFields on transformSchemas[obj]
  //
  // Authors add a single per-object entry under transformSchemas with native +
  // customFields + toCommon + fromCommon, rather than splitting customFields
  // into a separate top-level `extensions` dict. Legacy `extensions` surface is
  // still supported for customFields-only plugins.
  // ############################################################################

  describe("transformSchemas.customFields (consolidated shape)", () => {
    it("applies customFields from transformSchemas[obj] to the compiled schema", () => {
      const plugin = definePlugin({
        transformSchemas: {
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

      const result = plugin.schemas.Opportunity.parse({
        ...validOpp,
        customFields: {
          legacyId: {
            name: "legacyId",
            fieldType: "object",
            value: { system: "legacy", id: 42 },
          },
        },
      });

      // Cast: type inference for `plugin.schemas[obj]` still flows through the
      // legacy `extensions` parameter, not through `transformSchemas[obj].customFields`.
      // Wiring the generic through transformSchemas is a follow-up; runtime
      // already applies customFields from either source.
      const legacy = result.customFields?.legacyId?.value as { system: string; id: number };
      expect(legacy.system).toBe("legacy");
      expect(legacy.id).toBe(42);
    });

    it("works without an `extensions` argument at all", () => {
      const plugin = definePlugin({
        transformSchemas: {
          Opportunity: {
            customFields: {
              category: { fieldType: CustomFieldType.string },
            },
          },
        },
      });

      // No extensions argument was passed; legacy surface is undefined.
      expect(plugin.extensions).toBeUndefined();
      // Compiled schema still applied customFields from transformSchemas.
      const result = plugin.schemas.Opportunity.parse({
        ...validOpp,
        customFields: {
          category: { name: "category", fieldType: "string", value: "Education" },
        },
      });
      expect(result.customFields?.category?.value).toBe("Education");
    });

    it("prefers transformSchemas[obj].customFields over extensions[obj] when both are set", () => {
      const plugin = definePlugin({
        // Legacy surface declares one shape...
        extensions: {
          Opportunity: {
            legacyId: { fieldType: CustomFieldType.string },
          },
        },
        // ...transformSchemas declares a different one for the same object.
        transformSchemas: {
          Opportunity: {
            customFields: {
              category: { fieldType: CustomFieldType.string },
            },
          },
        },
      } as const);

      // transformSchemas wins: the compiled schema validates `category`,
      // not `legacyId`.
      const result = plugin.schemas.Opportunity.safeParse({
        ...validOpp,
        customFields: {
          category: { name: "category", fieldType: "string", value: "Education" },
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
