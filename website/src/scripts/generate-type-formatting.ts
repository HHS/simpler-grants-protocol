import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { TypeFormatter } from "../lib/schema/type-formatter";
import { SchemaDocMapper } from "../lib/schema/schema-doc-mapper";
import { BuildScriptUtils } from "./utils";
import { HashUtils } from "../lib/schema/hash-utils";
import { Paths } from "../lib/schema/paths";

/**
 * Pre-computed type formatting entry
 */
interface TypeFormattingEntry {
  schemaName: string;
  propertyName: string;
  formattedType: string;
  contentHash: string;
}

/**
 * Type formatting collection
 */
interface TypeFormattingCollection {
  entries: Record<string, TypeFormattingEntry>;
  generatedAt: number;
  totalEntries: number;
}

/**
 * Build-time script to generate type formatting cache
 */
class TypeFormattingGenerator {
  /**
   * Main entry point
   */
  static async generate(): Promise<void> {
    console.log("Generating type formatting cache...");

    const startTime = Date.now();
    const entries: Record<string, TypeFormattingEntry> = {};

    try {
      // Initialize schema documentation mapping
      const docMap = SchemaDocMapper.getSchemaDocMap();
      const getSchemaDocPath = (schemaName: string) => docMap.get(schemaName);

      const schemasDir = join(process.cwd(), Paths.SCHEMAS_DIR);
      const yamlFiles = BuildScriptUtils.findFilesByExtension(
        schemasDir,
        ".yaml",
      );

      console.log(`Found ${yamlFiles.length} YAML schema files to process`);

      for (const filePath of yamlFiles) {
        const schemaEntries = this.processSchemaFile(
          filePath,
          getSchemaDocPath,
        );
        Object.assign(entries, schemaEntries);
      }

      const collection: TypeFormattingCollection = {
        entries,
        generatedAt: Date.now(),
        totalEntries: Object.keys(entries).length,
      };

      // Write to output file
      const outputPath = join(process.cwd(), Paths.TYPE_FORMATTING_CACHE);
      writeFileSync(outputPath, JSON.stringify(collection, null, 2));

      const duration = Date.now() - startTime;
      console.log(`Generated type formatting cache in ${duration}ms`);
      console.log(
        `Processed ${collection.totalEntries} type formatting entries`,
      );
      console.log(`Output written to: ${Paths.TYPE_FORMATTING_CACHE}`);
    } catch (error) {
      BuildScriptUtils.handleError(error, "type formatting cache generation");
    }
  }

  /**
   * Processes a single schema file and generates type formatting entries
   */
  private static processSchemaFile(
    filePath: string,
    getSchemaDocPath: (schemaName: string) => string | undefined,
  ): Record<string, TypeFormattingEntry> {
    const entries: Record<string, TypeFormattingEntry> = {};

    try {
      const content = readFileSync(filePath, "utf-8");
      const schema = yaml.load(content) as Record<string, unknown>;

      if (!schema) {
        console.warn(`Empty schema file: ${filePath}`);
        return entries;
      }

      const schemaName = BuildScriptUtils.extractSchemaName(filePath);

      // Process object schemas with properties
      if (schema.type === "object" && schema.properties) {
        for (const [propertyName, propertySchema] of Object.entries(
          schema.properties,
        )) {
          const formattedType = TypeFormatter.formatPropertyType(
            propertySchema as Record<string, unknown>,
            schema,
            getSchemaDocPath,
          );

          const entryKey = `${schemaName}.${propertyName}`;
          entries[entryKey] = {
            schemaName,
            propertyName,
            formattedType,
            contentHash: HashUtils.hashString(content),
          };
        }
      }

      // Process allOf schemas
      if (schema.allOf && Array.isArray(schema.allOf)) {
        for (const allOfItem of schema.allOf) {
          if (allOfItem.properties) {
            for (const [propertyName, propertySchema] of Object.entries(
              allOfItem.properties,
            )) {
              const formattedType = TypeFormatter.formatPropertyType(
                propertySchema as Record<string, unknown>,
                schema,
                getSchemaDocPath,
              );

              const entryKey = `${schemaName}.${propertyName}`;
              entries[entryKey] = {
                schemaName,
                propertyName,
                formattedType,
                contentHash: HashUtils.hashString(content),
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not process schema file ${filePath}: ${error}`);
    }

    return entries;
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  TypeFormattingGenerator.generate().catch((error) => {
    console.error("Failed to generate type formatting cache:", error);
    process.exit(1);
  });
}

export { TypeFormattingGenerator };
