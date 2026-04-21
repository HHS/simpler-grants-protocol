import { describe, it, expect } from "vitest";
import { stripIds } from "@/lib/schema/strip-ids";

describe("stripIds", () => {
  it("removes a top-level $id field", () => {
    const result = stripIds({ $id: "Foo.yaml", type: "object" });
    expect(result).not.toHaveProperty("$id");
    expect(result).toHaveProperty("type", "object");
  });

  it("removes $id fields nested inside properties", () => {
    const schema = {
      type: "object",
      properties: {
        address: { $id: "QuestionAddress.yaml", type: "object" },
      },
    };
    const result = stripIds(schema) as typeof schema;
    expect(result.properties.address).not.toHaveProperty("$id");
    expect(result.properties.address.type).toBe("object");
  });

  it("removes duplicate $id values at multiple levels (the multi-composite case)", () => {
    const schema = {
      $id: "SF424Mandatory.yaml",
      properties: {
        org: { $id: "QuestionAddress.yaml", type: "object" },
        aor: { $id: "QuestionAddress.yaml", type: "object" },
      },
    };
    const result = stripIds(schema) as typeof schema;
    expect(result).not.toHaveProperty("$id");
    expect(result.properties.org).not.toHaveProperty("$id");
    expect(result.properties.aor).not.toHaveProperty("$id");
  });

  it("does not remove non-string $id values", () => {
    // $id is always a string per JSON Schema spec, but guard the edge case
    const schema = { $id: 42, type: "string" };
    const result = stripIds(schema) as typeof schema;
    expect(result.$id).toBe(42);
  });

  it("leaves schemas with no $id unchanged", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    const result = stripIds(schema);
    expect(result).toEqual(schema);
  });
});
