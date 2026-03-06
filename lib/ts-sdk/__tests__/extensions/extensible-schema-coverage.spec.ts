import { describe, it, expect } from "vitest";
import { z } from "zod";
import { EXTENSIBLE_SCHEMA_MAP } from "@/extensions/types";
import * as zodModels from "@/schemas/zod/models";

describe("extensible schema coverage", () => {
  it("every schema with customFields should be in EXTENSIBLE_SCHEMA_MAP", () => {
    const registeredSchemas = new Set<z.AnyZodObject>(Object.values(EXTENSIBLE_SCHEMA_MAP));

    for (const [name, value] of Object.entries(zodModels)) {
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
});
