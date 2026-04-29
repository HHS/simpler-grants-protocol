import { describe, it, expect } from "vitest";
import { buildFormSchema } from "./adapter";
import type { FormItem } from "@/lib/forms";

const minimalItem: FormItem = {
  id: "test-form",
  schema: "TestForm",
  label: "Test Form",
  description: "A test form",
  url: "https://example.com",
  name: "Test Form",
  tags: [],
  properties: {},
  examples: [],
  rawSchema: { type: "object", properties: {} },
  uiSchema: { type: "VerticalLayout", elements: [] },
  mappingFromCg: { field1: { field: "cg.field1" } },
  mappingToCg: { "cg.field1": { field: "field1" } },
  overrides: {},
};

const exampleJson = JSON.stringify({ field1: "hello" });

describe("buildFormSchema", () => {
  it("maps id, label, description, url from FormItem", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.id).toBe("test-form");
    expect(result.label).toBe("Test Form");
    expect(result.description).toBe("A test form");
    expect(result.url).toBe("https://example.com");
  });

  it("sets owner to empty string", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.owner).toBe("");
  });

  it("maps rawSchema → formSchema", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.formSchema).toBe(minimalItem.rawSchema);
  });

  it("maps uiSchema → formUI", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.formUI).toBe(minimalItem.uiSchema);
  });

  it("parses exampleJson → defaultData", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.defaultData).toEqual({ field1: "hello" });
  });

  it("maps mappingToCg → mappingToCommon", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.mappingToCommon).toBe(minimalItem.mappingToCg);
  });

  it("maps mappingFromCg → mappingFromCommon", () => {
    const result = buildFormSchema(minimalItem, exampleJson);
    expect(result.mappingFromCommon).toBe(minimalItem.mappingFromCg);
  });

  it("omits url key entirely when undefined", () => {
    const itemNoUrl = { ...minimalItem, url: undefined };
    const result = buildFormSchema(itemNoUrl, exampleJson);
    expect("url" in result).toBe(false);
  });

  it("throws on malformed exampleJson", () => {
    expect(() => buildFormSchema(minimalItem, "not-json")).toThrow(SyntaxError);
  });
});
