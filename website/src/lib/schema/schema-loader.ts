import { readFileSync } from "fs";
import { join, dirname } from "path";
import yaml from "js-yaml";
import { createAjvWithSchemas } from "../validation";
import { HashUtils } from "./hash-utils";

/**
 * JSON Schema object structure
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  $ref?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  format?: string;
  $defs?: Record<string, JsonSchema>;
  examples?: unknown[];
  [key: string]: unknown;
}

/**
 * Configuration for a schema spec
 */
export interface SchemaSpec {
  /** JSON Schema configuration containing the file path or inline code */
  jsonSchema?: {
    file?: {
      /** Path to the schema file relative to the repository root */
      path: string;
    };
    code?: string;
  };
}

/**
 * Error types for schema loading
 */
export class SchemaLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "SchemaLoadError";
  }
}

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

/**
 * Schema loader service for handling schema file operations
 */
export class SchemaLoader {
  private static ajv = createAjvWithSchemas();
  private static schemaCache = new Map<string, JsonSchema>();
  private static inlineSchemaCache = new Map<string, JsonSchema>();

  /**
   * Loads and parses a schema file from the given path with caching
   */
  static loadSchema(schemaPath: string): JsonSchema {
    // Check cache first
    if (this.schemaCache.has(schemaPath)) {
      return this.schemaCache.get(schemaPath)!;
    }

    try {
      const websiteRoot = process.cwd();
      const repoRoot = dirname(websiteRoot);
      const filePath = join(repoRoot, schemaPath);
      const content = readFileSync(filePath, "utf-8");

      const schemaData = yaml.load(content, {
        schema: yaml.CORE_SCHEMA,
      }) as JsonSchema;

      if (!schemaData) {
        throw new SchemaLoadError(
          `Schema file is empty or invalid: ${schemaPath}`,
        );
      }

      // Cache the parsed schema
      this.schemaCache.set(schemaPath, schemaData);
      return schemaData;
    } catch (error) {
      if (error instanceof SchemaLoadError) {
        throw error;
      }
      throw new SchemaLoadError(
        `Error reading schema file ${schemaPath}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Loads and parses an inline schema from YAML code with caching
   */
  static loadInlineSchema(schemaCode: string): JsonSchema {
    // Create a hash of the schema code for caching
    const codeHash = HashUtils.hashString(schemaCode);

    // Check cache first
    if (this.inlineSchemaCache.has(codeHash)) {
      return this.inlineSchemaCache.get(codeHash)!;
    }

    try {
      const schemaData = yaml.load(schemaCode, {
        schema: yaml.CORE_SCHEMA,
      }) as JsonSchema;

      if (!schemaData) {
        throw new SchemaLoadError("Inline schema is empty or invalid");
      }

      // Cache the parsed schema
      this.inlineSchemaCache.set(codeHash, schemaData);
      return schemaData;
    } catch (error) {
      if (error instanceof SchemaLoadError) {
        throw error;
      }
      throw new SchemaLoadError(
        "Error parsing inline schema",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Validates that a schema spec has the required structure
   */
  static validateSchemaSpec(spec: SchemaSpec): void {
    if (!spec.jsonSchema?.file?.path && !spec.jsonSchema?.code) {
      throw new SchemaValidationError(
        "SchemaTable requires a spec with jsonSchema.file.path or jsonSchema.code",
      );
    }
  }

  /**
   * Resolves a schema reference to get the actual schema object
   */
  static resolveSchemaReference(ref: string): JsonSchema | null {
    try {
      const resolvedSchema = this.ajv.getSchema(ref);
      if (resolvedSchema?.schema) {
        return resolvedSchema.schema as JsonSchema;
      }
      return null;
    } catch (error) {
      console.warn(
        `Warning: Could not resolve schema reference ${ref}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Determines if a schema is an enum schema
   */
  static isEnumSchema(schema: JsonSchema): boolean {
    return schema.type === "string" && Boolean(schema.enum);
  }

  /**
   * Determines if a schema is an object schema
   */
  static isObjectSchema(schema: JsonSchema): boolean {
    return schema.type === "object" && Boolean(schema.properties);
  }

  /**
   * Clears all caches (useful for testing or when schemas change)
   */
  static clearCaches(): void {
    this.schemaCache.clear();
    this.inlineSchemaCache.clear();
  }
}
