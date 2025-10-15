import { readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { BuildScriptUtils } from "./utils";
import { HashUtils } from "../lib/schema/hash-utils";
import { Paths } from "../lib/schema/paths";

/**
 * Pre-computed schema metadata
 */
interface SchemaMetadata {
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
interface SchemaMetadataCollection {
  schemas: Record<string, SchemaMetadata>;
  generatedAt: number;
  totalSchemas: number;
}

/**
 * Build-time script to generate schema metadata
 */
class SchemaMetadataGenerator {
  /**
   * Main entry point
   */
  static async generate(): Promise<void> {
    console.log("Generating schema metadata...");

    const startTime = Date.now();
    const schemas: Record<string, SchemaMetadata> = {};

    try {
      const schemasDir = join(process.cwd(), Paths.SCHEMAS_DIR);
      const yamlFiles = BuildScriptUtils.findFilesByExtension(
        schemasDir,
        ".yaml",
      );

      console.log(`Found ${yamlFiles.length} YAML schema files to process`);

      for (const filePath of yamlFiles) {
        const metadata = this.processSchemaFile(filePath);
        if (metadata) {
          schemas[metadata.schemaName] = metadata;
        }
      }

      const collection: SchemaMetadataCollection = {
        schemas,
        generatedAt: Date.now(),
        totalSchemas: Object.keys(schemas).length,
      };

      // Write to output file
      const outputPath = join(process.cwd(), Paths.SCHEMA_METADATA);
      writeFileSync(outputPath, JSON.stringify(collection, null, 2));

      const duration = Date.now() - startTime;
      console.log(`Generated schema metadata in ${duration}ms`);
      console.log(`Processed ${collection.totalSchemas} schemas`);
      console.log(`Output written to: ${Paths.SCHEMA_METADATA}`);
    } catch (error) {
      BuildScriptUtils.handleError(error, "schema metadata generation");
    }
  }

  /**
   * Processes a single schema file and extracts metadata
   */
  private static processSchemaFile(filePath: string): SchemaMetadata | null {
    try {
      const content = readFileSync(filePath, "utf-8");
      const schema = yaml.load(content) as Record<string, unknown>;

      if (!schema) {
        console.warn(`Empty schema file: ${filePath}`);
        return null;
      }

      const schemaName = BuildScriptUtils.extractSchemaName(filePath);
      const stats = statSync(filePath);
      const lastModified = stats.mtime.getTime();

      const metadata: SchemaMetadata = {
        schemaName,
        filePath: filePath.replace(process.cwd() + "/", ""),
        type: this.determineSchemaType(schema),
        isEnum: this.isEnumSchema(schema),
        isObject: this.isObjectSchema(schema),
        properties: this.extractProperties(schema),
        enumValues: this.extractEnumValues(schema),
        lastModified,
        contentHash: HashUtils.hashString(content),
      };

      return metadata;
    } catch (error) {
      console.warn(`Could not process schema file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Determines the primary type of a schema
   */
  private static determineSchemaType(
    schema: Record<string, unknown>,
  ): SchemaMetadata["type"] {
    if (schema.type) {
      return schema.type as SchemaMetadata["type"];
    }

    if (schema.enum) {
      return "enum";
    }

    if (schema.properties) {
      return "object";
    }

    return "unknown";
  }

  /**
   * Checks if schema is an enum schema
   */
  private static isEnumSchema(schema: Record<string, unknown>): boolean {
    return schema.type === "string" && Array.isArray(schema.enum);
  }

  /**
   * Checks if schema is an object schema
   */
  private static isObjectSchema(schema: Record<string, unknown>): boolean {
    return schema.type === "object" && Boolean(schema.properties);
  }

  /**
   * Extracts property names from object schemas
   */
  private static extractProperties(
    schema: Record<string, unknown>,
  ): string[] | undefined {
    if (schema.properties && typeof schema.properties === "object") {
      return Object.keys(schema.properties);
    }
    return undefined;
  }

  /**
   * Extracts enum values from enum schemas
   */
  private static extractEnumValues(
    schema: Record<string, unknown>,
  ): string[] | undefined {
    if (Array.isArray(schema.enum)) {
      return schema.enum.map((value: unknown) => String(value));
    }
    return undefined;
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  SchemaMetadataGenerator.generate().catch((error) => {
    console.error("Failed to generate schema metadata:", error);
    process.exit(1);
  });
}

export { SchemaMetadataGenerator };
