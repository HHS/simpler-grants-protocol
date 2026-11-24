import { describe, it, expect } from "vitest";
import { refreshSchemaSourcesForRender } from "@/lib/schema/dev-refresh";
import { SchemaDocMapper } from "@/lib/schema/schema-doc-mapper";
import { findDeclaration } from "@/lib/schema/source-declarations";

describe("refreshSchemaSourcesForRender", () => {
  it("re-reads the sources and the page map once for each new render, and not again within it", () => {
    const declaration = findDeclaration("python", "Money");
    const map = SchemaDocMapper.getSchemaDocMap();
    expect(findDeclaration("python", "Money")).toBe(declaration);
    expect(SchemaDocMapper.getSchemaDocMap()).toBe(map);

    const render = {};
    refreshSchemaSourcesForRender(render);
    const rereadDeclaration = findDeclaration("python", "Money");
    const rereadMap = SchemaDocMapper.getSchemaDocMap();
    expect(rereadDeclaration).not.toBe(declaration);
    expect(rereadDeclaration).toEqual(declaration);
    expect(rereadMap).not.toBe(map);
    expect(rereadMap).toEqual(map);

    // Further components on the same page reuse what that render read.
    refreshSchemaSourcesForRender(render);
    expect(findDeclaration("python", "Money")).toBe(rereadDeclaration);
    expect(SchemaDocMapper.getSchemaDocMap()).toBe(rereadMap);

    refreshSchemaSourcesForRender({});
    expect(findDeclaration("python", "Money")).not.toBe(rereadDeclaration);
    expect(SchemaDocMapper.getSchemaDocMap()).not.toBe(rereadMap);
  });
});
