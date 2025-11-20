import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import yaml from "js-yaml";
import type { JsonSchema } from "@jsonforms/core";
import { BuildScriptUtils } from "./utils";
import {
  generateSchemaVersions,
  type VersionGenerationResult,
} from "../lib/schema/version-generator";
import type { Changelog } from "typespec-versioning-changelog";

/**
 * Build-time script to generate versioned schemas
 */
class VersionedSchemaGenerator {
  /**
   * Main entry point
   */
  static async generate(): Promise<void> {
    console.log("Generating versioned schemas...");

    const startTime = Date.now();

    try {
      // Load the changelog
      const changelog = this.loadChangelog();
      console.log(
        `Loaded changelog with ${changelog.versions.length} versions`,
      );

      // Load all current schemas
      const schemas = this.loadSchemas();
      console.log(`Loaded ${schemas.size} current schemas`);

      // Generate versioned schemas for each version
      const results: VersionGenerationResult[] = [];

      for (const version of changelog.versions) {
        console.log(`\nGenerating schemas for version ${version}...`);
        const result = generateSchemaVersions(version, changelog, schemas);
        results.push(result);
        console.log(
          `  Generated ${result.schemas.size} schemas for version ${version}`,
        );
      }

      // Write versioned schemas to disk
      this.writeVersionedSchemas(results);

      const duration = Date.now() - startTime;
      console.log(`\n✓ Generated versioned schemas in ${duration}ms`);
      console.log(`  Processed ${changelog.versions.length} versions`);
      console.log(`  Output written to: tsp-output/schemas/versions/`);
    } catch (error) {
      BuildScriptUtils.handleError(error, "versioned schema generation");
    }
  }

  /**
   * Loads the changelog from the TypeSpec output
   */
  private static loadChangelog(): Changelog {
    const changelogPath = join(
      process.cwd(),
      "tsp-output",
      "typespec-versioning-changelog",
      "changelog.json",
    );

    if (!existsSync(changelogPath)) {
      throw new Error(`Changelog not found at: ${changelogPath}`);
    }

    const content = readFileSync(changelogPath, "utf-8");
    return JSON.parse(content) as Changelog;
  }

  /**
   * Loads all current schemas from the TypeSpec output directory
   */
  private static loadSchemas(): Map<string, JsonSchema> {
    const schemasDir = join(
      process.cwd(),
      "tsp-output",
      "@typespec",
      "json-schema",
    );
    const yamlFiles = BuildScriptUtils.findFilesByExtension(
      schemasDir,
      ".yaml",
    );

    const schemas = new Map<string, JsonSchema>();

    for (const filePath of yamlFiles) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const schema = yaml.load(content) as JsonSchema;

        if (!schema) {
          console.warn(`Empty schema file: ${filePath}`);
          continue;
        }

        const schemaName = BuildScriptUtils.extractSchemaName(filePath);
        schemas.set(schemaName, schema);
      } catch (error) {
        console.warn(`Could not load schema ${filePath}: ${error}`);
      }
    }

    return schemas;
  }

  /**
   * Writes versioned schemas to disk, organized by version
   */
  private static writeVersionedSchemas(
    results: VersionGenerationResult[],
  ): void {
    const baseDir = join(process.cwd(), "tsp-output", "schemas", "versions");

    for (const result of results) {
      // Create version directory (e.g., tsp-output/schemas/versions/v0.1.0/)
      const versionDir = join(baseDir, `v${result.version}`);

      if (!existsSync(versionDir)) {
        mkdirSync(versionDir, { recursive: true });
      }

      // Write each schema to a YAML file
      for (const [schemaName, schema] of result.schemas) {
        const outputPath = join(versionDir, `${schemaName}.yaml`);

        // Ensure directory exists
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        // Convert schema to YAML and write
        const yamlContent = yaml.dump(schema, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
        });

        writeFileSync(outputPath, yamlContent, "utf-8");
      }

      console.log(`  Wrote ${result.schemas.size} schemas to ${versionDir}`);
    }
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  VersionedSchemaGenerator.generate().catch((error) => {
    console.error("Failed to generate versioned schemas:", error);
    process.exit(1);
  });
}

export { VersionedSchemaGenerator };
