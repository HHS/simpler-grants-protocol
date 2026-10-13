import { describe, it, expect } from "vitest";
import { z } from "zod";
import { EXTENSIBLE_SCHEMA_MAP } from "@/extensions/types";
import * as zodAwards from "@/schemas/zod/awards";
import * as zodModels from "@/schemas/zod/models";

describe("extensible schema coverage", () => {
  it("every schema with customFields should be in EXTENSIBLE_SCHEMA_MAP", () => {
    const registeredSchemas = new Set<z.ZodObject>(Object.values(EXTENSIBLE_SCHEMA_MAP));

    const publicModelSchemas = { ...zodModels, ...zodAwards };

    for (const [name, value] of Object.entries(publicModelSchemas)) {
      if (!(value instanceof z.ZodObject)) continue;
      if (!("customFields" in value.shape)) continue;

      expect(
        registeredSchemas.has(value),
        `Schema "${name}" has customFields but is not in EXTENSIBLE_SCHEMA_MAP. ` +
          `Register it in ExtensibleSchemaName and EXTENSIBLE_SCHEMA_MAP.`
      ).toBe(true);
    }
  });

  it("every entry in EXTENSIBLE_SCHEMA_MAP should have customFields", () => {
    for (const [name, schema] of Object.entries(EXTENSIBLE_SCHEMA_MAP)) {
      expect(
        "customFields" in schema.shape,
        `EXTENSIBLE_SCHEMA_MAP["${name}"] does not have a customFields property.`
      ).toBe(true);
    }
  });

  it("should not register OpportunityDetailsSchema in EXTENSIBLE_SCHEMA_MAP", () => {
    const registeredSchemas = new Set<unknown>(Object.values(EXTENSIBLE_SCHEMA_MAP));

    expect(registeredSchemas.has(zodModels.OpportunityDetailsSchema)).toBe(false);
  });

  it("should resolve customFields declared on the base schema when parsing through OpportunityDetailsSchema", () => {
    const validDetails = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Sample Grant Opportunity",
      status: { value: "open" },
      description: "A sample grant opportunity for testing",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-02T00:00:00Z",
      customFields: {
        foo: { fieldType: "string", name: "foo", value: "bar" },
      },
    };

    const parsed = zodModels.OpportunityDetailsSchema.parse(validDetails);

    expect(parsed.customFields?.foo).toEqual({ fieldType: "string", name: "foo", value: "bar" });
  });
});
