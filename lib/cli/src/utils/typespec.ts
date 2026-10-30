import * as path from "path";
import * as fs from "fs";

/**
 * Resolves the path to the TypeSpec compiler's `tsp` entry point.
 *
 * Reads the `bin` field of `@typespec/compiler/package.json` instead of resolving
 * `.bin/tsp`, because pnpm writes `.bin/tsp` as a shell shim that `node` can't run.
 * This allows us to provide a thin wrapper around `tsp` commands
 * like `tsp init` and `tsp compile` that we want to call from the CLI.
 *
 * The compiler is resolved from the CLI's own install on purpose: its `tsp` runner
 * hands off to the project's local compiler when one exists, so anchoring the lookup
 * to the user's working directory would not change which compiler runs.
 * @param resolve - Module resolver, injectable for tests
 * @returns The absolute path to the compiler's `tsp` JavaScript file
 */
export function resolveTspBinPath(resolve: (id: string) => string = require.resolve): string {
  try {
    const pkgJsonPath = resolve("@typespec/compiler/package.json");
    const { bin } = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      bin?: string | Record<string, unknown>;
    };
    const tspBin = typeof bin === "string" ? bin : bin?.tsp;
    if (typeof tspBin !== "string") {
      throw new Error("@typespec/compiler/package.json has no tsp bin");
    }
    return path.resolve(path.dirname(pkgJsonPath), tspBin);
  } catch (error) {
    throw new Error(
      "Could not find the TypeSpec compiler (@typespec/compiler). " +
        "Reinstall @common-grants/cli and try again.",
      { cause: error }
    );
  }
}

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
