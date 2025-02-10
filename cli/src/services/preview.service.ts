import { PreviewService, PreviewOptions } from "./interfaces";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import yaml from "js-yaml";

export class DefaultPreviewService implements PreviewService {
  private readonly outputPath = join(
    process.cwd(),
    "tsp-output",
    "@typespec/openapi3",
    "openapi.yaml"
  );

  async previewSpec(specPath: string, _: PreviewOptions): Promise<void> {
    const app = express();
    const port = 3000;

    try {
      const openapiSpec = await this.getOpenApiSpec(specPath);

      app.use(
        "/",
        swaggerUi.serve,
        swaggerUi.setup(openapiSpec, {
          explorer: true,
        })
      );

      // Start server
      const server = app.listen(port, () => {
        console.log(`Preview server running at http://localhost:${port}`);
        // Open browser
        const openCommand =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        spawn(openCommand, [`http://localhost:${port}`]);
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
      const specContent = await this.loadSpecContent(specPath);
      const spec = yaml.load(specContent);

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

  private async loadSpecContent(specPath: string): Promise<string> {
    if (specPath.endsWith(".tsp")) {
      await this.compileTypeSpec(specPath);
      return readFile(this.outputPath, "utf-8");
    }
    return readFile(specPath, "utf-8");
  }

  private async compileTypeSpec(specPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tsp = spawn("npx", ["tsp", "compile", specPath], {
        stdio: "inherit",
      });

      tsp.on("error", error => {
        console.error("Failed to compile TypeSpec:", error);
        reject(error);
      });

      tsp.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`TypeSpec compilation failed with code ${code}`));
        }
      });
    });
  }
}
