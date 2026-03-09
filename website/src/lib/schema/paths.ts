/**
 * Centralized file path configuration for the SchemaTable ecosystem
 */
export class Paths {
  // Build output directories
  static readonly PUBLIC_DIR = "public";
  static readonly SCHEMAS_DIR = "public/schemas/yaml";
  static readonly OPENAPI_DIR = "public/openapi";
  /** Custom field schema output (gitignored); path relative to website process.cwd() */
  static readonly CUSTOM_FIELD_SCHEMAS_DIR = ".custom-field-schemas";
  /** Custom field schema path prefix relative to repo root (for SchemaFormatTabs / SchemaLoader) */
  static readonly CUSTOM_FIELD_SCHEMAS_PATH_PREFIX =
    "website/.custom-field-schemas";
  /** Question bank schema output (gitignored); path relative to website process.cwd() */
  static readonly QUESTION_BANK_SCHEMAS_DIR = ".question-bank-schemas";
  /** Question bank schema path prefix relative to repo root */
  static readonly QUESTION_BANK_SCHEMAS_PATH_PREFIX =
    "website/.question-bank-schemas";

  // Generated cache files
  static readonly SCHEMA_DOCS_MAPPING = "cache/schema-docs-mapping.json";
  static readonly SCHEMA_METADATA = "cache/schema-metadata.json";
  static readonly TYPE_FORMATTING_CACHE = "cache/type-formatting-cache.json";

  // Source directories
  static readonly CONTENT_DOCS_DIR = "src/content/docs";
  static readonly PROTOCOL_DOCS_DIR = "src/content/docs/protocol";
}
