import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import yaml from "js-yaml";

export class DefaultPreviewService {
  async createPreviewApp(specPath: string): Promise<Express> {
    const app: Express = express();
    const openapiSpec = await this.getOpenApiSpec(specPath);
    app.use(
      "/",
      swaggerUi.serve,
      swaggerUi.setup(openapiSpec, {
        explorer: false,
      })
    );
    return app;
  }

  async previewSpec(specPath: string): Promise<void> {
    const app = await this.createPreviewApp(specPath);
    const port = 3000;

    try {
      const server = app.listen(port, () => {
        console.log(`Preview server running at http://localhost:${port}`);
      });

      // Handle server shutdown
      process.on("SIGINT", () => {
        server.close(() => {
          console.log("\nPreview server stopped");
          process.exit(0);
        });
      });
    } catch (error) {
      console.error("Failed to start preview server:", error);
      throw error;
    }
  }

  private async getOpenApiSpec(specPath: string): Promise<object> {
    try {
      const specContent = await readFile(specPath, "utf-8");
      const spec = yaml.load(specContent); // parses YAML or JSON string content

      if (!spec || typeof spec !== "object") {
        throw new Error("Invalid OpenAPI specification format");
      }

      return spec;
    } catch (error) {
      if (error instanceof Error) {
        // Check if the error is a file not found error
        if (error.message.includes("ENOENT")) {
          throw new Error(
            `File not found: ${specPath}\nPlease check that the file exists and you have the correct path.`
          );
        }
        // For YAML parsing errors, provide a more helpful message
        if (error.message.includes("yaml")) {
          throw new Error(
            `Failed to parse OpenAPI specification: The file is not valid YAML/JSON format.\nError: ${error.message}`
          );
        }
        throw new Error(`Failed to load OpenAPI specification: ${error.message}`);
      }
      throw error;
    }
  }
}
