import { readdirSync } from "fs";
import { join } from "path";

/**
 * Shared utilities for build scripts
 */
export class BuildScriptUtils {
  /**
   * Recursively finds all files with the specified extension in a directory
   */
  static findFilesByExtension(dir: string, extension: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.findFilesByExtension(fullPath, extension));
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}: ${error}`);
    }

    return files;
  }

  /**
   * Extracts schema name from file path
   */
  static extractSchemaName(filePath: string): string {
    const fileName = filePath.split("/").pop() || "";
    return fileName.replace(".yaml", "");
  }

  /**
   * Standardized error handling for build scripts
   */
  static handleError(error: unknown, context: string): never {
    console.error(`Error in ${context}:`, error);
    process.exit(1);
  }
}
