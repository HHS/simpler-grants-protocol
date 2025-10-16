import { readFileSync } from "fs";
import { join } from "path";
import { Paths } from "./paths";

/**
 * Pre-computed schema metadata
 */
export interface SchemaMetadata {
  schemaName: string;
  filePath: string;
  type:
    | "object"
    | "enum"
    | "array"
    | "string"
    | "number"
    | "boolean"
    | "unknown";
  isEnum: boolean;
  isObject: boolean;
  properties?: string[];
  enumValues?: string[];
  lastModified: number;
  contentHash: string;
}

/**
 * Schema metadata collection
 */
export interface SchemaMetadataCollection {
  schemas: Record<string, SchemaMetadata>;
  generatedAt: number;
  totalSchemas: number;
}

/**
 * Schema metadata loader service
 */
export class SchemaMetadataLoader {
  private static cache: SchemaMetadataCollection | null = null;

  /**
   * Loads schema metadata with caching
   */
  static loadMetadata(): SchemaMetadataCollection {
    if (this.cache) {
      return this.cache;
    }

    try {
      const metadataPath = join(process.cwd(), Paths.SCHEMA_METADATA);
      const metadataContent = readFileSync(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent) as SchemaMetadataCollection;

      this.cache = metadata;
      console.log(`Loaded schema metadata (${metadata.totalSchemas} schemas)`);
      return metadata;
    } catch (error) {
      console.warn(`Could not load schema metadata: ${error}`);

      // Return empty collection as fallback
      const fallback: SchemaMetadataCollection = {
        schemas: {},
        generatedAt: Date.now(),
        totalSchemas: 0,
      };

      this.cache = fallback;
      return fallback;
    }
  }

  /**
   * Gets metadata for a specific schema
   */
  static getSchemaMetadata(schemaName: string): SchemaMetadata | undefined {
    const metadata = this.loadMetadata();
    return metadata.schemas[schemaName];
  }

  /**
   * Checks if a schema is an enum schema
   */
  static isEnumSchema(schemaName: string): boolean {
    const metadata = this.getSchemaMetadata(schemaName);
    return metadata?.isEnum || false;
  }

  /**
   * Checks if a schema is an object schema
   */
  static isObjectSchema(schemaName: string): boolean {
    const metadata = this.getSchemaMetadata(schemaName);
    return metadata?.isObject || false;
  }

  /**
   * Gets all schema names
   */
  static getAllSchemaNames(): string[] {
    const metadata = this.loadMetadata();
    return Object.keys(metadata.schemas);
  }

  /**
   * Gets schemas by type
   */
  static getSchemasByType(type: SchemaMetadata["type"]): SchemaMetadata[] {
    const metadata = this.loadMetadata();
    return Object.values(metadata.schemas).filter(
      (schema) => schema.type === type,
    );
  }

  /**
   * Clears the cache (useful for testing)
   */
  static clearCache(): void {
    this.cache = null;
  }
}
