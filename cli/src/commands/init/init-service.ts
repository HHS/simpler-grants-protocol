import { spawn } from "child_process";
import { tspBinPath } from "../../utils/typespec";
import { InitCommandOptions } from "../../types/command-args";

const cgTemplate =
  "https://raw.githubusercontent.com/HHS/simpler-grants-protocol/refs/heads/main/templates/template.json";

export class DefaultInitService {
  private templates: string[] = [];

  async listTemplates(): Promise<string[]> {
    // If templates haven't been loaded yet, load them
    if (this.templates.length === 0) {
      await this.loadTemplates();
    }
    return this.templates;
  }

  /**
   * Loads available templates from the template.json file
   * @private
   */
  private async loadTemplates(): Promise<void> {
    try {
      const response = await fetch(cgTemplate);
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      const templateJson = (await response.json()) as Record<string, unknown>;
      this.templates = Object.keys(templateJson);
    } catch (error) {
      console.error("Failed to load templates:", error);
      // Fallback to default templates if loading fails
      this.templates = ["default-api", "custom-api"];
    }
  }

  /**
   * Initializes a new CommonGrants project using the TypeSpec CLI.
   *
   * This function spawns a child process to run `npx tsp init` with our template.
   * It uses spawn (instead of exec) to support interactive prompts from the TypeSpec CLI.
   * The process inherits stdio, allowing users to respond to initialization prompts.
   *
   * @param options - Configuration options for initialization
   * @param options.template - Optional template name to use (e.g., "grants-api")
   *
   * @returns Promise that resolves when initialization completes successfully
   * @throws Error if the initialization process fails or exits with non-zero code
   */
  async init(options: InitCommandOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the argument list for the tsp init command
      const args = [tspBinPath, "init", cgTemplate];

      // Add template argument if specified in options
      if (options.template) {
        args.push("--template", options.template);
      }

      // Spawn node process to run the TypeSpec CLI
      const child = spawn("node", args, {
        stdio: "inherit",
      });

      // Handle any errors that occur while spawning/running the process
      child.on("error", error => {
        console.error("Error executing tsp init:", error);
        reject(error);
      });

      // Handle process completion
      child.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }
}
