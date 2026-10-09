import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import { AppRefSchema } from "@/schemas";
import type { BoundaryCase } from "../../utils/fuzz-test";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

// ############################################################################
// AppRef schema
// ############################################################################

describe("AppRef Schema", () => {
  const jsonSchemaId = "AppRef.yaml";

  it("should validate a reference with id and title", () => {
    const value = { id: VALID_UUID, title: "My Application" };
    expect(AppRefSchema.parse(value)).toEqual(value);
  });

  it("should match AppRef.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "valid reference", value: { id: VALID_UUID, title: "My Application" } },
      { label: "missing id is rejected", value: { title: "My Application" } },
      { label: "missing title is rejected", value: { id: VALID_UUID } },
      { label: "non-uuid id is rejected", value: { id: "not-a-uuid", title: "My Application" } },
      {
        label: "extra top-level key is rejected",
        value: { id: VALID_UUID, title: "My Application", unexpected: true },
      },
    ];
    await expectZodMatchesJsonSchema(AppRefSchema, jsonSchemaId, cases, 0, true);
  });

  it("should reject a missing required field", () => {
    expect(() => AppRefSchema.parse({ id: VALID_UUID })).toThrow();
    expect(() => AppRefSchema.parse({ title: "My Application" })).toThrow();
  });
});
