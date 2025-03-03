// Resolves the path to the tsp binary
// This allows us to provide a thin wrapper around `tsp` commands
// like `tsp init` and `tsp compile` that we want to call from the CLI
export const tspBinPath = require.resolve(".bin/tsp");

import { execSync, ExecException } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Compiles the main.tsp file and returns the path to the output OpenAPI spec
 * @returns The path to the compiled output file
 * @throws Error if compilation fails
 */
export function compileTypeSpec(): string {
  const mainTspPath = path.resolve(__dirname, "main.tsp");
  const outputDir = path.resolve(__dirname, "../.generated");
  const outputFile = path.join(outputDir, "@typespec/openapi3/openapi.yaml");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Run tsp compile command
    execSync(
      `"${tspBinPath}" compile "${mainTspPath}" --emit @typespec/openapi3 --output-dir "${outputDir}"`,
      {
        stdio: ["ignore", "ignore", "pipe"], // Ignore stdin/stdout, pipe stderr for error handling
      }
    );

    // Verify the file was created
    if (!fs.existsSync(outputFile)) {
      throw new Error("TypeSpec compilation completed but output file was not created");
    }

    return outputFile;
  } catch (error) {
    // If we have stderr output, include it in the error message
    const stderr =
      error instanceof Error && "stderr" in error
        ? (error as ExecException).stderr?.toString()
        : "";
    const errorMessage = stderr || (error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to compile TypeSpec: ${errorMessage}`);
  }
}
