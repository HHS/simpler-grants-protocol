import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import {
  buildSchemaDocMap,
  SchemaDocMapper,
} from "@/lib/schema/schema-doc-mapper";

describe("buildSchemaDocMap", () => {
  let contentDir: string;

  /** Writes a page under the temporary docs directory. */
  function writePage(relativePath: string, content: string): void {
    const file = path.join(contentDir, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  beforeAll(() => {
    contentDir = mkdtempSync(path.join(tmpdir(), "schema-doc-map-"));

    writePage(
      "protocol/models/award.mdx",
      [
        "---",
        "title: Award",
        "---",
        "",
        "## AwardBase",
        "",
        '<SchemaTable schema="AwardBase" />',
        "",
        "<SchemaFormatTabs",
        '  schema="AwardBase"',
        "  typeSpec",
        "/>",
        "",
        "## AwdIds",
        "",
        '<SchemaFormatTabs schema="AwdIds" typeSpec />',
        "",
        "## A template, which has no JSON Schema",
        "",
        '<SchemaFormatTabs typeSpec="ExtensibleEnumT" />',
      ].join("\n"),
    );

    writePage(
      "protocol/types/string.mdx",
      [
        "---",
        "title: String types",
        "url:",
        "  jsonSchema:",
        "    code: |",
        "      $id: url.yaml",
        "      type: string",
        "---",
        "",
        "<SchemaFormatTabs jsonSchema={frontmatter.url.jsonSchema} />",
        "",
        '<SchemaFormatTabs schema="email" typeSpec />',
      ].join("\n"),
    );

    // Sorts before types/, so types/string.mdx wins for `email`.
    writePage(
      "protocol/fields/email.mdx",
      '<SchemaFormatTabs schema="email" typeSpec="Email" />\n',
    );
  });

  afterAll(() => {
    rmSync(contentDir, { recursive: true, force: true });
  });

  it("maps each schema a page names to that page", () => {
    const map = buildSchemaDocMap(
      path.join(contentDir, "protocol"),
      contentDir,
    );
    expect(map.get("AwardBase")).toBe("/protocol/models/award");
    expect(map.get("AwdIds")).toBe("/protocol/models/award");
    expect(map.get("ExtensibleEnumT")).toBeUndefined();
  });

  it("maps an inline schema's JSON type to its page as well", () => {
    const map = buildSchemaDocMap(
      path.join(contentDir, "protocol"),
      contentDir,
    );
    expect(map.get("url")).toBe("/protocol/types/string");
    expect(map.get("string")).toBe("/protocol/types/string");
  });

  it("lets the later page win when two pages name the same schema", () => {
    const map = buildSchemaDocMap(
      path.join(contentDir, "protocol"),
      contentDir,
    );
    expect(map.get("email")).toBe("/protocol/types/string");
  });
});

describe("SchemaDocMapper", () => {
  it("builds the map from the real protocol pages", () => {
    SchemaDocMapper.clearCache();
    expect(SchemaDocMapper.getSchemaDocPath("OrgRef")).toBe(
      "/protocol/models/organization",
    );
    expect(SchemaDocMapper.getSchemaDocPath("Money")).toBe(
      "/protocol/fields/money",
    );
    expect(SchemaDocMapper.getSchemaDocPath("PaginatedResultsInfo")).toBe(
      "/protocol/pagination",
    );
    expect(SchemaDocMapper.getSchemaDocPath("string")).toBe(
      "/protocol/types/string",
    );
  });
});
