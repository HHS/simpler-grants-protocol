import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ApiError } from "../errors/api-error";

export class DocumentationService {
  private static openApiPath = path.join(
    process.cwd(),
    "tsp-output",
    "@typespec",
    "openapi3",
    "openapi.Custom.yaml"
  );

  static getOpenApiSpec(): object {
    try {
      const fileContents = fs.readFileSync(this.openApiPath, "utf8");
      const spec = yaml.load(fileContents);

      if (!spec || typeof spec !== "object") {
        throw new Error("Invalid OpenAPI specification format");
      }

      return spec;
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(
          500,
          `Failed to load OpenAPI specification: ${error.message}`
        );
      }
      throw error;
    }
  }

  static isSpecGenerated(): boolean {
    return fs.existsSync(this.openApiPath);
  }

  static getSpecLastModified(): Date {
    try {
      const stats = fs.statSync(this.openApiPath);
      return stats.mtime;
    } catch {
      throw new ApiError(
        500,
        "Failed to get OpenAPI specification modification time"
      );
    }
  }
}
