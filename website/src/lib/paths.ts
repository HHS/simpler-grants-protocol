/**
 * Centralized file path configuration for the SchemaTable ecosystem
 */
export class Paths {
  // Build output directories
  static readonly PUBLIC_DIR = "public";
  static readonly SCHEMAS_DIR = "public/schemas/yaml";
  static readonly OPENAPI_DIR = "public/openapi";

  // Generated cache files
  static readonly SCHEMA_DOCS_MAPPING = "public/schema-docs-mapping.json";
  static readonly SCHEMA_METADATA = "public/schema-metadata.json";
  static readonly TYPE_FORMATTING_CACHE = "public/type-formatting-cache.json";

  // Source directories
  static readonly CONTENT_DOCS_DIR = "src/content/docs";
  static readonly PROTOCOL_DOCS_DIR = "src/content/docs/protocol";

  // Build script output directories
  static readonly TSP_OUTPUT_DIR = "tsp-output";
}
