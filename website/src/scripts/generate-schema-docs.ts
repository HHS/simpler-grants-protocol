import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { BuildScriptUtils } from "./utils";
import { Paths } from "../lib/schema/paths";

/**
 * Frontmatter schema definition structure
 */
interface FrontmatterSchemaDef {
  jsonSchema?: {
    file?: {
      path?: string;
    };
    code?: string;
  };
}

/**
 * Frontmatter structure
 */
interface Frontmatter {
  [key: string]: FrontmatterSchemaDef | unknown;
}

/**
 * Build-time script to generate schema documentation mapping
 */
class SchemaDocGenerator {
  /**
   * Main entry point
   */
  static async generate(): Promise<void> {
    console.log("Generating schema documentation mapping...");

    const startTime = Date.now();
    const mapping = new Map<string, string>();

    try {
      const docsDir = join(process.cwd(), Paths.PROTOCOL_DOCS_DIR);
      const mdxFiles = BuildScriptUtils.findFilesByExtension(docsDir, ".mdx");

      console.log(`Found ${mdxFiles.length} MDX files to process`);

      for (const file of mdxFiles) {
        const references = this.extractSchemaReferences(file);
        for (const { schemaName, docPath } of references) {
          mapping.set(schemaName, docPath);
        }
      }

      // Convert to object for JSON serialization
      const mappingObject = Object.fromEntries(mapping);

      // Write to output file
      const outputPath = join(process.cwd(), Paths.SCHEMA_DOCS_MAPPING);
      writeFileSync(outputPath, JSON.stringify(mappingObject, null, 2));

      const duration = Date.now() - startTime;
      console.log(`Generated schema documentation mapping in ${duration}ms`);
      console.log(`Mapped ${mapping.size} schemas to documentation paths`);
      console.log(`Output written to: ${Paths.SCHEMA_DOCS_MAPPING}`);
    } catch (error) {
      BuildScriptUtils.handleError(
        error,
        "schema documentation mapping generation",
      );
    }
  }

  /**
   * Extracts schema references from an MDX file's frontmatter
   */
  private static extractSchemaReferences(
    filePath: string,
  ): Array<{ schemaName: string; docPath: string }> {
    const references: Array<{ schemaName: string; docPath: string }> = [];

    try {
      const content = readFileSync(filePath, "utf-8");
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) return references;

      const frontmatterYaml = frontmatterMatch[1];
      const frontmatter = yaml.load(frontmatterYaml) as Frontmatter;

      // Convert file path to documentation URL
      const relativePath = filePath.replace(
        process.cwd() + "/" + Paths.CONTENT_DOCS_DIR + "/",
        "",
      );
      const docPath = "/" + relativePath.replace(/\.mdx$/, "");

      // Extract schema paths from each schema definition
      for (const [, schemaDef] of Object.entries(frontmatter)) {
        if (
          typeof schemaDef === "object" &&
          schemaDef !== null &&
          "jsonSchema" in schemaDef
        ) {
          const jsonSchema = (schemaDef as FrontmatterSchemaDef).jsonSchema;
          if (
            jsonSchema?.file?.path &&
            typeof jsonSchema.file.path === "string"
          ) {
            const schemaPath = jsonSchema.file.path;
            if (schemaPath.includes(Paths.SCHEMAS_DIR + "/")) {
              // Extract schema name from path
              const schemaFileName = schemaPath
                .split("/")
                .pop()
                ?.replace(".yaml", "");
              if (schemaFileName) {
                references.push({ schemaName: schemaFileName, docPath });
              }
            }
          } else if (jsonSchema?.code) {
            // Handle inline schemas (like basic types in types/ directory)
            const schemaName = Object.keys(frontmatter).find(
              (k) => frontmatter[k] === schemaDef,
            );
            if (schemaName) {
              references.push({ schemaName, docPath });

              // Also add the actual JSON Schema type to the map
              try {
                const schemaCode = yaml.load(jsonSchema.code) as {
                  type?: string;
                };
                if (
                  schemaCode &&
                  typeof schemaCode === "object" &&
                  schemaCode.type
                ) {
                  references.push({ schemaName: schemaCode.type, docPath });
                }
              } catch (error) {
                console.warn(
                  `Could not parse schema code for ${schemaName}: ${error}`,
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not read file ${filePath}: ${error}`);
    }

    return references;
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  SchemaDocGenerator.generate().catch((error) => {
    console.error("Failed to generate schema documentation mapping:", error);
    process.exit(1);
  });
}

export { SchemaDocGenerator };
