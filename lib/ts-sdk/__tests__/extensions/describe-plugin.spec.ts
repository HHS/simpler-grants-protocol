import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CustomFieldType } from "@/constants";
import {
  definePlugin,
  describePlugin,
  PLUGIN_DESCRIPTOR_VERSION,
  type TransformResult,
} from "@/extensions";

describe("describePlugin", () => {
  it("describes structural plugin capabilities as JSON-safe data", () => {
    const sourceSchema = z.object({ legacy_id: z.string() });
    const toCommon = (): TransformResult<unknown> => ({ result: {}, errors: [] });
    const fromCommon = (): TransformResult<unknown> => ({
      result: { legacy_id: "123" },
      errors: [],
    });
    const plugin = definePlugin({
      meta: {
        name: "California grants",
        version: "0.1.0",
        sourceSystem: "California Grants Portal",
        capabilities: ["customFields", "customFilters", "transforms"],
      },
      schemas: {
        Opportunity: {
          sourceSchema,
          customFields: {
            legacyId: {
              name: "Legacy identifier",
              fieldType: CustomFieldType.string,
              description: "California source identifier",
            },
          },
          toCommon,
          fromCommon,
        },
      },
      routes: {
        opportunities: {
          search: {
            filters: {
              agency: {
                filterType: "stringArray",
                description: "California agency",
              },
            },
          },
        },
      },
    } as const);

    const descriptor = describePlugin(plugin);

    expect(descriptor).toEqual({
      descriptorVersion: PLUGIN_DESCRIPTOR_VERSION,
      plugin: {
        name: "California grants",
        version: "0.1.0",
        sourceSystem: "California Grants Portal",
      },
      capabilities: {
        declared: ["customFields", "customFilters", "transforms"],
        observed: ["customFields", "customFilters", "transforms"],
        status: "match",
        declaredButNotObserved: [],
        observedButNotDeclared: [],
      },
      schemas: [
        {
          name: "Opportunity",
          customFields: [
            {
              key: "legacyId",
              name: "Legacy identifier",
              fieldType: "string",
              description: "California source identifier",
            },
          ],
          sourceSchema: true,
          transforms: {
            mode: "callable",
            toCommon: true,
            fromCommon: true,
          },
        },
      ],
      routes: [
        {
          resource: "opportunities",
          method: "search",
          filters: [
            {
              name: "agency",
              filterType: "stringArray",
              description: "California agency",
            },
          ],
        },
      ],
    });
    expect(JSON.parse(JSON.stringify(descriptor))).toEqual(descriptor);
  });

  it("reports observed capabilities that were not declared", () => {
    const plugin = definePlugin({
      schemas: {
        Opportunity: {
          customFields: {
            legacyId: { fieldType: CustomFieldType.string },
          },
        },
      },
    } as const);

    expect(describePlugin(plugin).capabilities).toEqual({
      declared: [],
      observed: ["customFields"],
      status: "undeclared",
      declaredButNotObserved: [],
      observedButNotDeclared: ["customFields"],
    });
  });

  it("reports capabilities that were declared but not observed", () => {
    const plugin = definePlugin({
      meta: {
        name: "empty-plugin",
        sourceSystem: "empty-source",
        capabilities: ["customFields", "customFilters", "transforms"],
      },
    } as const);

    expect(describePlugin(plugin).capabilities).toEqual({
      declared: ["customFields", "customFilters", "transforms"],
      observed: [],
      status: "mismatch",
      declaredButNotObserved: ["customFields", "customFilters", "transforms"],
      observedButNotDeclared: [],
    });
  });

  it("returns a stable empty descriptor for a plugin with no declarations", () => {
    const descriptor = describePlugin(definePlugin({} as const));

    expect(descriptor).toEqual({
      descriptorVersion: PLUGIN_DESCRIPTOR_VERSION,
      plugin: {
        name: null,
        version: null,
        sourceSystem: null,
      },
      capabilities: {
        declared: [],
        observed: [],
        status: "undeclared",
        declaredButNotObserved: [],
        observedButNotDeclared: [],
      },
      schemas: [
        {
          name: "Opportunity",
          customFields: [],
          sourceSchema: false,
          transforms: {
            mode: "none",
            toCommon: false,
            fromCommon: false,
          },
        },
      ],
      routes: [],
    });
  });

  it("sorts schema fields and route declarations by their stable keys", () => {
    const plugin = definePlugin({
      schemas: {
        Opportunity: {
          customFields: {
            zeta: { fieldType: CustomFieldType.string },
            alpha: { fieldType: CustomFieldType.number },
          },
        },
      },
      routes: {
        opportunities: {
          search: {
            filters: {
              zeta: { filterType: "stringArray" },
              alpha: { filterType: "numberComparison" },
            },
          },
        },
      },
    } as const);

    const descriptor = describePlugin(plugin);

    expect(descriptor.schemas[0].customFields.map(field => field.key)).toEqual(["alpha", "zeta"]);
    expect(descriptor.routes[0].filters.map(filter => filter.name)).toEqual(["alpha", "zeta"]);
  });

  it("distinguishes declarative transforms from callable transforms", () => {
    const plugin = definePlugin({
      schemas: {
        Opportunity: {
          sourceSchema: z.object({}),
          mappings: {
            toCommon: {},
            fromCommon: {},
          },
        },
      },
    } as const);

    expect(describePlugin(plugin).schemas[0].transforms).toEqual({
      mode: "declarative",
      toCommon: true,
      fromCommon: true,
    });
  });
});
