import { PreviewService } from "./interfaces";
import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import yaml from "js-yaml";

export class DefaultPreviewService implements PreviewService {
  async createPreviewApp(specPath: string): Promise<Express> {
    const app: Express = express();

    try {
      const openapiSpec = await this.getOpenApiSpec(specPath);
      app.use(
        "/",
        swaggerUi.serve,
        swaggerUi.setup(openapiSpec, {
          explorer: true,
        })
      );
      return app;
    } catch (error) {
      console.error("Failed to create preview app:", error);
      throw error;
    }
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
        throw new Error(`Failed to load OpenAPI specification: ${error.message}`);
      }
      throw error;
    }
  }
}
