import { describe, it, expect } from "vitest";
import { schemaFilePath } from "@/lib/schema/schema-files";

// Reads the generated schemas — run `pnpm --filter website run build` first.
describe("schemaFilePath", () => {
  it("gives the generated JSON Schema file for a schema", () => {
    expect(schemaFilePath("AwardBase")).toBe(
      "website/public/schemas/yaml/AwardBase.yaml",
    );
  });

  it("gives a version's copy when asked for one", () => {
    expect(schemaFilePath("CompetitionBase", "v0.5.0")).toBe(
      "website/public/schemas/yaml/versions/v0.5.0/CompetitionBase.yaml",
    );
  });

  it("fails for a schema that has no JSON Schema file", () => {
    expect(() => schemaFilePath("NoSuchSchema")).toThrow(
      /No JSON Schema for "NoSuchSchema"/,
    );
    expect(() => schemaFilePath("AwardBase", "v0.1.0")).toThrow(
      /No JSON Schema for "AwardBase" in v0.1.0/,
    );
  });
});
