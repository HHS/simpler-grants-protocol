import { InitService, InitOptions } from "./interfaces";
import { spawn } from "child_process";

const cgTemplate =
  "https://raw.githubusercontent.com/HHS/simpler-grants-protocol/refs/heads/main/templates/template.json";

export class DefaultInitService implements InitService {
  private readonly templates = ["grants-api", "custom-fields", "minimal-api"];

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
  async init(options: InitOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the argument list for the tsp init command
      // First two arguments are always "init" and the template URL
      const args = ["init", cgTemplate];

      // Add template argument if specified in options
      if (options.template) {
        args.push("--template", options.template);
      }

      // Spawn npx process to run the TypeSpec CLI
      // - First argument is the command to run via npx ("tsp")
      // - Second argument spreads our built args array
      // - stdio: "inherit" connects the child process I/O directly to the parent,
      //   allowing interactive prompts to work
      const child = spawn("npx", ["tsp", ...args], {
        stdio: "inherit",
      });

      // Handle any errors that occur while spawning/running the process
      // This catches issues like "command not found" or permission errors
      child.on("error", error => {
        console.error("Error executing tsp init:", error);
        reject(error);
      });

      // Handle process completion
      // - code 0 indicates success
      // - any other code indicates failure
      child.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }

  async listTemplates(): Promise<string[]> {
    return Promise.resolve(this.templates);
  }
}
