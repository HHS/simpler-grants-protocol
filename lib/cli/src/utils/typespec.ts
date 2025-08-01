// Resolves the path to the tsp binary
// This allows us to provide a thin wrapper around `tsp` commands
// like `tsp init` and `tsp compile` that we want to call from the CLI
export const tspBinPath = require.resolve(".bin/tsp");

import * as path from "path";
import * as fs from "fs";

/**
 * Finds the main.tsp file in the CLI package
 * @returns The path to the main.tsp file
 */
export function findMainTspPath(): string {
  // In development, the file is in the lib directory at the root of the package
  const libPath = path.resolve(__dirname, "../../lib/main.tsp");
  if (fs.existsSync(libPath)) {
    return libPath;
  }

  // When installed as a package, it might be in a different location
  // This is a fallback for tests or other scenarios
  throw new Error("Could not find main.tsp file");
}
