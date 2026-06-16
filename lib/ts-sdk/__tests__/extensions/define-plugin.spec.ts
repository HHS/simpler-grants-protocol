import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  buildTransforms,
  definePlugin,
  type PluginMeta,
  type TransformResult,
  type PluginRoutes,
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
      const meta: PluginMeta = { name: "test", sourceSystem: "test" };

      const plugin = definePlugin({ meta });

      expect(plugin.meta).toBe(meta);
    });
  });

  // ############################################################################
  // Extensible schemas (Opportunity)
  // ############################################################################

  describe("extensible schemas", () => {
    it("should parse payloads with custom fields via plugin.schemas.Opportunity.commonSchema", () => {
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

      const result = plugin.schemas.Opportunity.commonSchema.parse({
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

      const result = plugin.schemas.Opportunity.commonSchema.safeParse({
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

      expect(plugin.schemas.Opportunity.commonSchema).toBe(OpportunityBaseSchema);
    });

    it("should return base schema under .common when customFields is empty", () => {
      const plugin = definePlugin({
        schemas: { Opportunity: { customFields: {} } },
      });

      expect(plugin.schemas.Opportunity.commonSchema).toBe(OpportunityBaseSchema);
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
  // routes
  // ############################################################################

  describe("routes", () => {
    it("passes routes through to plugin.routes unchanged", () => {
      const routes: PluginRoutes = {
        opportunities: {
          search: {
            filters: {
              agency: { filterType: "stringArray" },
              fundingProgram: { filterType: "stringComparison", description: "Filter by program" },
            },
          },
        },
      };

      const plugin = definePlugin({ routes } as const);

      expect(plugin.routes).toBe(routes);
    });

    it("plugin.routes is undefined when routes not provided", () => {
      const plugin = definePlugin({});

      expect(plugin.routes).toBeUndefined();
    });

    it("routes are accessible for later filter classification (structure round-trip)", () => {
      const plugin = definePlugin({
        routes: {
          opportunities: {
            search: {
              filters: {
                agency: { filterType: "stringArray" },
              },
            },
          },
        },
      } as const);

      const filterSpec = plugin.routes?.opportunities?.search?.filters?.agency;
      expect(filterSpec?.filterType).toBe("stringArray");
    });
  });

  // ############################################################################
  // schemas (transform callables)
  // ############################################################################

  describe("schemas (transforms)", () => {
    it("exposes toCommon and fromCommon callables on the returned plugin schemas", () => {
      const { toCommon, fromCommon } = buildTransforms(
        { title: { field: "data.opportunity_title" } },
        { data: { opportunity_title: { field: "title" } } }
      );

      const plugin = definePlugin({
        schemas: {
          Opportunity: { sourceSchema: z.object({}).passthrough(), toCommon, fromCommon },
        },
      });

      // definePlugin wraps callables with schema validation, so the references differ.
      // Verify they are callable functions.
      expect(typeof plugin.schemas.Opportunity.toCommon).toBe("function");
      expect(typeof plugin.schemas.Opportunity.fromCommon).toBe("function");
    });

    it("invokes the stored transform callable via plugin.schemas", () => {
      // Mapping must cover all required OpportunityBaseSchema fields because
      // definePlugin wraps toCommon with commonSchema validation.
      const { toCommon, fromCommon } = buildTransforms(
        {
          id: { field: "native_id" },
          title: { field: "native_title" },
          description: { const: "Test opportunity" },
          createdAt: { const: "2025-01-01T00:00:00Z" },
          lastModifiedAt: { const: "2025-01-01T00:00:00Z" },
          status: { value: { const: "open" } },
        },
        { native_title: { field: "title" }, native_id: { field: "id" } }
      );

      const plugin = definePlugin({
        schemas: {
          Opportunity: { sourceSchema: z.object({}).passthrough(), toCommon, fromCommon },
        },
      });

      const out = plugin.schemas.Opportunity.toCommon?.({
        native_id: "573525f2-8e15-4405-83fb-e6523511d893",
        native_title: "Hello",
      }) as TransformResult<{ title: string }>;

      expect(out.errors).toEqual([]);
      expect(out.result.title).toBe("Hello");
    });

    it("leaves toCommon and fromCommon undefined when not provided", () => {
      const plugin = definePlugin({});

      expect(plugin.schemas.Opportunity.toCommon).toBeUndefined();
      expect(plugin.schemas.Opportunity.fromCommon).toBeUndefined();
    });

    it("does not expose transform callables as callable on a schema-only entry", () => {
      // A customFields-only entry resolves to the schema-only shape, so calling
      // toCommon is a compile error (not just `undefined` at runtime). The guarded
      // block never executes; the `@ts-expect-error` fails the build if the type
      // ever starts exposing a callable transform here.
      const plugin = definePlugin({
        schemas: { Opportunity: { customFields: { legacyId: { fieldType: "integer" } } } },
      });
      expect(plugin.schemas.Opportunity.commonSchema).toBeDefined();
      expect(plugin.schemas.Opportunity.customFields).toBeDefined();
      if (false as boolean) {
        // @ts-expect-error — toCommon is not callable on a schema-only entry
        plugin.schemas.Opportunity.toCommon({});
      }
    });

    it("rejects hand-written transforms without a sourceSchema (compile-time)", () => {
      const noop = (): TransformResult<unknown> => ({ result: {}, errors: [] });
      definePlugin({
        schemas: {
          // @ts-expect-error — the functions path requires a sourceSchema
          Opportunity: { toCommon: noop, fromCommon: noop },
        },
      });
    });

    it("rejects a single transform direction (compile-time)", () => {
      const noop = (): TransformResult<unknown> => ({ result: {}, errors: [] });
      definePlugin({
        schemas: {
          // @ts-expect-error — the functions path requires both toCommon and fromCommon
          Opportunity: { sourceSchema: z.object({}).passthrough(), toCommon: noop },
        },
      });
    });

    it("validates fromCommon output against the sourceSchema", () => {
      const sourceSchema = z.object({ native_id: z.string() });
      const plugin = definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema,
            toCommon: (): TransformResult<unknown> => ({ result: validOpp, errors: [] }),
            // Returns a source object missing the required native_id.
            fromCommon: (): TransformResult<unknown> => ({ result: { wrong: true }, errors: [] }),
          },
        },
      });

      const out = plugin.schemas.Opportunity.fromCommon?.({} as never);
      expect(out?.errors.length ?? 0).toBeGreaterThan(0);
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

      const result = plugin.schemas.Opportunity.commonSchema.parse({
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

      // Common schema defaults to base schema when no customFields provided.
      const result = plugin.schemas.Opportunity.commonSchema.parse(validOpp);
      expect(result.title).toBe("Test Opportunity");
    });
  });
});

// ############################################################################
// Auto-wiring from mappings
// ############################################################################

// Mappings used across auto-wiring tests. toCommon covers all required fields of
// OpportunityBaseSchema so that Zod validation (run because `common` is passed as
// commonModel in the auto-wiring call) does not produce errors.
// `status: { value: { const: "open" } }` produces `{ value: "open" }` because
// `value` is an output key and `{ const: "open" }` dispatches the const handler.
const autoWireToCommonMapping = {
  id: { field: "native_id" },
  title: { field: "native_title" },
  description: { const: "Test opportunity" },
  createdAt: { const: "2025-01-01T00:00:00Z" },
  lastModifiedAt: { const: "2025-01-01T00:00:00Z" },
  status: { value: { const: "open" } },
};
const autoWireFromCommonMapping = {
  native_title: { field: "title" },
  native_id: { field: "id" },
};
// Transform entries require a sourceSchema. The mappings runtime here doesn't use
// it, so a permissive shape is fine for these tests.
const autoWireSourceSchema = z.object({}).passthrough();

describe("definePlugin — auto-wiring from mappings", () => {
  it("auto-generates working toCommon/fromCommon from schemas.Opportunity.mappings", () => {
    const plugin = definePlugin({
      schemas: {
        Opportunity: {
          sourceSchema: autoWireSourceSchema,
          mappings: {
            toCommon: autoWireToCommonMapping,
            fromCommon: autoWireFromCommonMapping,
          },
        },
      },
    });

    const sourceData = {
      native_id: "573525f2-8e15-4405-83fb-e6523511d893",
      native_title: "Test Opp",
    };
    const result = plugin.schemas.Opportunity.toCommon?.(sourceData);
    expect(result?.errors).toHaveLength(0);
    expect(result?.result).toMatchObject({
      id: "573525f2-8e15-4405-83fb-e6523511d893",
      title: "Test Opp",
    });
  });

  it("throws when both mappings and explicit toCommon/fromCommon are provided (XOR constraint)", () => {
    const explicitToCommon = (_: unknown): TransformResult<unknown> => ({
      result: { id: "explicit" },
      errors: [],
    });
    const explicitFromCommon = (_: unknown): TransformResult<unknown> => ({
      result: {},
      errors: [],
    });

    expect(() =>
      definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema: autoWireSourceSchema,
            mappings: {
              toCommon: autoWireToCommonMapping,
              fromCommon: autoWireFromCommonMapping,
            },
            // @ts-expect-error — intentionally testing XOR constraint: mappings + explicit callables is invalid
            toCommon: explicitToCommon,
            // @ts-expect-error — intentionally testing XOR constraint: mappings + explicit callables is invalid
            fromCommon: explicitFromCommon,
          },
        },
      })
    ).toThrow(/cannot specify both mappings and explicit toCommon\/fromCommon/);
  });

  it("throws when mappings and a single explicit callable are both provided (XOR constraint)", () => {
    const explicitToCommon = (_: unknown): TransformResult<unknown> => ({
      result: {},
      errors: [],
    });

    expect(() =>
      definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema: autoWireSourceSchema,
            mappings: {
              toCommon: autoWireToCommonMapping,
              fromCommon: autoWireFromCommonMapping,
            },
            // @ts-expect-error — intentionally testing XOR constraint: mappings + explicit callable is invalid
            toCommon: explicitToCommon,
          },
        },
      })
    ).toThrow(/cannot specify both mappings and explicit toCommon\/fromCommon/);
  });

  it("throws at definition time when mappings.fromCommon is absent", () => {
    expect(() =>
      definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema: autoWireSourceSchema,
            mappings: {
              toCommon: autoWireToCommonMapping,
              // fromCommon intentionally absent
            },
          },
        },
      })
    ).toThrow(/Opportunity\.mappings\.fromCommon is required/);
  });

  it("throws at definition time when mappings.toCommon is absent", () => {
    expect(() =>
      definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema: autoWireSourceSchema,
            mappings: {
              // toCommon intentionally absent
              fromCommon: autoWireFromCommonMapping,
            },
          },
        },
      })
    ).toThrow(/Opportunity\.mappings\.toCommon is required/);
  });

  it("auto-wired toCommon rejects unknown output fields via validateOutputPaths", () => {
    expect(() =>
      definePlugin({
        schemas: {
          Opportunity: {
            sourceSchema: autoWireSourceSchema,
            mappings: {
              toCommon: { unknownFieldXyz: { field: "data.x" } },
              fromCommon: autoWireFromCommonMapping,
            },
          },
        },
      })
    ).toThrow(/unknown output fields.*"unknownFieldXyz"/);
  });

  it("preserves source schema on schemas[Name] in the auto-wired branch", () => {
    const sourceSchema = z.object({ native_id: z.string(), native_title: z.string() });

    const plugin = definePlugin({
      schemas: {
        Opportunity: {
          sourceSchema,
          mappings: {
            toCommon: autoWireToCommonMapping,
            fromCommon: autoWireFromCommonMapping,
          },
        },
      },
    });

    expect(plugin.schemas.Opportunity.sourceSchema).toBe(sourceSchema);
  });

  it("no-ops cleanly when schemas is absent entirely", () => {
    const plugin = definePlugin({});
    expect(plugin.schemas.Opportunity.toCommon).toBeUndefined();
    expect(plugin.schemas.Opportunity.fromCommon).toBeUndefined();
  });

  it("no-ops cleanly when schemas has no key for this model name", () => {
    const plugin = definePlugin({ schemas: {} });
    expect(plugin.schemas.Opportunity.toCommon).toBeUndefined();
  });

  it("no-ops cleanly when schemas[Name].mappings is undefined", () => {
    const plugin = definePlugin({
      schemas: { Opportunity: { mappings: undefined } },
    });
    expect(plugin.schemas.Opportunity.toCommon).toBeUndefined();
  });
});
