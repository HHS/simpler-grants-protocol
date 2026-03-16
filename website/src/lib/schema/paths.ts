import * as path from "path";

/**
 * Centralized file path configuration for schema documentation generation.
 *
 * All paths are absolute so callers never need to call process.cwd() directly.
 *
 * Directory tree (relative to WEBSITE_ROOT unless noted):
 *
 *   cache/
 *     schema-docs-mapping.json
 *     schema-metadata.json
 *     type-formatting-cache.json
 *   public/
 *     openapi/
 *     schemas/
 *       yaml/
 *   .extension-schemas/          (gitignored; extension schema output)
 *   src/
 *     content/
 *       docs/
 *         protocol/               (PROTOCOL_DOCS_DIR)
 *
 * REPO_ROOT is the parent of WEBSITE_ROOT. Extension schemas are referenced
 * from repo root as website/.extension-schemas (EXTENSION_SCHEMAS_PATH_PREFIX).
 */
export class Paths {
  /** Absolute path to the website directory (process.cwd() at build time) */
  static readonly WEBSITE_ROOT = process.cwd();
  /** Absolute path to the repo root (parent of the website directory) */
  static readonly REPO_ROOT = path.resolve(Paths.WEBSITE_ROOT, "..");

  // Build output directories
  static readonly CACHE_DIR = path.join(Paths.WEBSITE_ROOT, "cache");
  static readonly PUBLIC_DIR = path.join(Paths.WEBSITE_ROOT, "public");
  static readonly SCHEMAS_DIR = path.join(Paths.PUBLIC_DIR, "schemas", "yaml");
  static readonly OPENAPI_DIR = path.join(Paths.PUBLIC_DIR, "openapi");

  /** Extension schema output (gitignored) */
  static readonly EXTENSION_SCHEMAS_DIR = path.join(
    Paths.WEBSITE_ROOT,
    ".extension-schemas",
  );
  /** Extension schema path prefix relative to repo root (for SchemaFormatTabs / SchemaLoader) */
  static readonly EXTENSION_SCHEMAS_PATH_PREFIX = path
    .relative(Paths.REPO_ROOT, Paths.EXTENSION_SCHEMAS_DIR)
    .split(path.sep)
    .join("/");

  // Generated cache files
  static readonly SCHEMA_DOCS_MAPPING = path.join(
    Paths.CACHE_DIR,
    "schema-docs-mapping.json",
  );
  static readonly SCHEMA_METADATA = path.join(
    Paths.CACHE_DIR,
    "schema-metadata.json",
  );
  static readonly TYPE_FORMATTING_CACHE = path.join(
    Paths.CACHE_DIR,
    "type-formatting-cache.json",
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
