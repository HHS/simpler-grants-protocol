import { readdirSync, readFileSync } from "fs";
import * as path from "path";
import yaml from "js-yaml";
import { Paths } from "./paths";

/** A `<SchemaTable>` or `<SchemaFormatTabs>` tag's `schema="Name"` attribute */
const SCHEMA_ATTRIBUTE =
  /<Schema(?:Table|FormatTabs)\b[^>]*?\bschema="([^"]+)"/g;

/** A frontmatter entry holding an inline JSON Schema */
interface InlineSchemaEntry {
  jsonSchema?: { code?: string };
}

/**
 * Maps each schema to the docs page that documents it, by reading which
 * schemas each protocol page names. Schema tables use it to link a property's
 * type to its page.
 *
 * Pages name a schema with `schema="Name"` on `<SchemaTable>` or
 * `<SchemaFormatTabs>`. A section whose JSON Schema is written inline in the
 * frontmatter (the basic types) maps under its frontmatter key and under the
 * schema's JSON `type`. When two pages name a schema, the later page wins.
 *
 * @param protocolDocsDir - Directory of protocol pages to read
 * @param contentDocsDir - Root of the docs content, which page URLs are relative to
 */
export function buildSchemaDocMap(
  protocolDocsDir: string,
  contentDocsDir: string,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const file of listPages(protocolDocsDir)) {
    const content = readFileSync(file, "utf-8");
    const docPath =
      "/" +
      path
        .relative(contentDocsDir, file)
        .split(path.sep)
        .join("/")
        .replace(/\.mdx$/, "");

    for (const match of content.matchAll(SCHEMA_ATTRIBUTE)) {
      map.set(match[1], docPath);
    }

    for (const [name, type] of inlineSchemas(content, file)) {
      map.set(name, docPath);
      if (type) map.set(type, docPath);
    }
  }

  return map;
}

/** Lists the inline JSON Schemas in a page's frontmatter, with their types. */
function inlineSchemas(
  content: string,
  file: string,
): Array<[string, string | undefined]> {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!frontmatter) return [];

  const data = yaml.load(frontmatter) as Record<string, unknown>;
  const result: Array<[string, string | undefined]> = [];
  for (const [name, entry] of Object.entries(data ?? {})) {
    const code = (entry as InlineSchemaEntry | null)?.jsonSchema?.code;
    if (typeof code !== "string") continue;

    let type: string | undefined;
    try {
      const schema = yaml.load(code) as { type?: unknown };
      if (typeof schema?.type === "string") type = schema.type;
    } catch (error) {
      throw new Error(`Inline JSON Schema "${name}" in ${file} isn't YAML`, {
        cause: error,
      });
    }
    result.push([name, type]);
  }
  return result;
}

/** Lists the MDX pages under a directory, in a stable order. */
function listPages(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listPages(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Schema documentation mapping service. Builds the map from the protocol
 * pages the first time it's asked, once per build.
 */
export class SchemaDocMapper {
  private static cache: Map<string, string> | null = null;

  /** Gets the schema documentation mapping, building it on first use */
  static getSchemaDocMap(): Map<string, string> {
    if (!this.cache) {
      this.cache = buildSchemaDocMap(
        Paths.PROTOCOL_DOCS_DIR,
        Paths.CONTENT_DOCS_DIR,
      );
    }
    return this.cache;
  }

  /** Gets documentation path for a specific schema name */
  static getSchemaDocPath(schemaName: string): string | undefined {
    return this.getSchemaDocMap().get(schemaName);
  }

  /** Clears the cache (useful for testing) */
  static clearCache(): void {
    this.cache = null;
  }
}
