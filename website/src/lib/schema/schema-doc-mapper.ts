import { readFileSync } from "fs";
import { join } from "path";
import { Paths } from "./paths";

/**
 * Schema documentation mapping service
 */
export class SchemaDocMapper {
  private static cache: Map<string, string> | null = null;

  /**
   * Gets the schema documentation mapping with memoization
   * Loads pre-computed mapping and fails if not available
   */
  static getSchemaDocMap(): Map<string, string> {
    if (this.cache) {
      return this.cache;
    }

    const mappingPath = join(process.cwd(), Paths.SCHEMA_DOCS_MAPPING);

    try {
      const mappingContent = readFileSync(mappingPath, "utf-8");
      const mappingObject = JSON.parse(mappingContent);

      const map = new Map<string, string>();
      for (const [schemaName, docPath] of Object.entries(mappingObject)) {
        map.set(schemaName, docPath as string);
      }

      this.cache = map;
      console.log(
        `Loaded pre-computed schema documentation mapping (${map.size} entries)`,
      );
      return map;
    } catch (error) {
      throw new Error(
        `Failed to load schema documentation mapping from ${mappingPath}: ${error}`,
      );
    }
  }

  /**
   * Gets documentation path for a specific schema name
   */
  static getSchemaDocPath(schemaName: string): string | undefined {
    const map = this.getSchemaDocMap();
    return map.get(schemaName);
  }

  /**
   * Clears the cache (useful for testing)
   */
  static clearCache(): void {
    this.cache = null;
  }
}
