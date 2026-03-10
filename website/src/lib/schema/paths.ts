/**
 * Centralized file path configuration for the SchemaTable ecosystem
 */
export class Paths {
  // Build output directories
  static readonly PUBLIC_DIR = "public";
  static readonly SCHEMAS_DIR = "public/schemas/yaml";
  static readonly OPENAPI_DIR = "public/openapi";
  /** Extension schema output (gitignored); path relative to website process.cwd() */
  static readonly EXTENSION_SCHEMAS_DIR = ".extension-schemas";
  /** Extension schema path prefix relative to repo root (for SchemaFormatTabs / SchemaLoader) */
  static readonly EXTENSION_SCHEMAS_PATH_PREFIX = "website/.extension-schemas";

  // Generated cache files
  static readonly SCHEMA_DOCS_MAPPING = "cache/schema-docs-mapping.json";
  static readonly SCHEMA_METADATA = "cache/schema-metadata.json";
  static readonly TYPE_FORMATTING_CACHE = "cache/type-formatting-cache.json";

  // Source directories
  static readonly CONTENT_DOCS_DIR = "src/content/docs";
  static readonly PROTOCOL_DOCS_DIR = "src/content/docs/protocol";
}
