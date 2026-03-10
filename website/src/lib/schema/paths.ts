import * as path from "path";

/**
 * Centralized file path configuration for the SchemaTable ecosystem.
 *
 * All paths are absolute so callers never need to call process.cwd() directly.
 */
export class Paths {
  /** Absolute path to the website directory (process.cwd() at build time) */
  static readonly WEBSITE_ROOT = process.cwd();
  /** Absolute path to the repo root (parent of the website directory) */
  static readonly REPO_ROOT = path.resolve(Paths.WEBSITE_ROOT, "..");

  // Build output directories
  static readonly PUBLIC_DIR = path.join(Paths.WEBSITE_ROOT, "public");
  static readonly SCHEMAS_DIR = path.join(
    Paths.WEBSITE_ROOT,
    "public/schemas/yaml",
  );
  static readonly OPENAPI_DIR = path.join(Paths.WEBSITE_ROOT, "public/openapi");
  /** Extension schema output (gitignored) */
  static readonly EXTENSION_SCHEMAS_DIR = path.join(
    Paths.WEBSITE_ROOT,
    ".extension-schemas",
  );
  /** Extension schema path prefix relative to repo root (for SchemaFormatTabs / SchemaLoader) */
  static readonly EXTENSION_SCHEMAS_PATH_PREFIX = "website/.extension-schemas";

  // Generated cache files
  static readonly SCHEMA_DOCS_MAPPING = path.join(
    Paths.WEBSITE_ROOT,
    "cache/schema-docs-mapping.json",
  );
  static readonly SCHEMA_METADATA = path.join(
    Paths.WEBSITE_ROOT,
    "cache/schema-metadata.json",
  );
  static readonly TYPE_FORMATTING_CACHE = path.join(
    Paths.WEBSITE_ROOT,
    "cache/type-formatting-cache.json",
  );

  // Source directories
  static readonly CONTENT_DOCS_DIR = path.join(
    Paths.WEBSITE_ROOT,
    "src/content/docs",
  );
  static readonly PROTOCOL_DOCS_DIR = path.join(
    Paths.WEBSITE_ROOT,
    "src/content/docs/protocol",
  );
}
