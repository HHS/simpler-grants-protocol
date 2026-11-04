import { spawnSync } from "child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { createRequire } from "module";
import path from "path";
import { Paths } from "../lib/schema/paths";
import {
  extractGettingStartedProjects,
  extractReadmeProject,
  type QuickstartFiles,
} from "../lib/quickstart/extract";

/**
 * Compiles the quickstart projects shown in the Getting Started guide and the core
 * README against the in-repo `@common-grants/core`, so a core change that breaks
 * either quickstart fails CI.
 *
 * Each project is written under `website/.quickstart-check/` so that
 * `@common-grants/core` resolves to the website's workspace link to `lib/core`.
 * The directory is removed when the check finishes.
 */

const OUTPUT_DIR = path.join(Paths.WEBSITE_ROOT, ".quickstart-check");
const GETTING_STARTED = path.join(
  Paths.WEBSITE_ROOT,
  "src/content/docs/getting-started.mdx",
);
const CORE_README = path.join(Paths.REPO_ROOT, "lib/core/README.md");
const COMPILE_TIMEOUT_MS = 5 * 60 * 1000;

interface Quickstart {
  name: string;
  source: string;
  files: QuickstartFiles;
}

/** Absolute path to the TypeSpec compiler's `tsp` JS entry (not the `.bin` shim). */
function tspEntryPath(): string {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve("@typespec/compiler/package.json");
  const { bin } = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
    bin: Record<string, string>;
  };
  return path.resolve(path.dirname(pkgJsonPath), bin.tsp);
}

/** Compiles one quickstart and returns an error message, or null on success. */
function compileQuickstart(
  quickstart: Quickstart,
  tspEntry: string,
): string | null {
  const dir = path.join(OUTPUT_DIR, quickstart.name);
  mkdirSync(dir, { recursive: true });
  for (const [file, contents] of Object.entries(quickstart.files)) {
    writeFileSync(path.join(dir, file), contents);
  }

  const result = spawnSync(
    process.execPath,
    [tspEntry, "compile", "main.tsp"],
    {
      cwd: dir,
      encoding: "utf-8",
      timeout: COMPILE_TIMEOUT_MS,
    },
  );
  if (result.status !== 0) {
    const reason =
      result.error?.message ??
      (result.signal ? `tsp compile was killed (${result.signal})` : "");
    return [result.stdout, result.stderr, reason]
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const service = /^namespace\s+([\w.]+)\s*;/m.exec(
    quickstart.files["main.tsp"],
  )?.[1];
  if (!service) {
    return "Could not find a `namespace <Service>;` declaration in main.tsp";
  }
  const openapi = `tsp-output/@typespec/openapi3/openapi.${service}.yaml`;
  if (!existsSync(path.join(dir, openapi))) {
    return `Compiled, but did not emit ${openapi}`;
  }
  return null;
}

function main(): void {
  const gettingStarted = extractGettingStartedProjects(
    readFileSync(GETTING_STARTED, "utf-8"),
  );
  const quickstarts: Quickstart[] = [
    {
      name: "getting-started-initial",
      source: "Getting Started (First steps)",
      files: gettingStarted.initial,
    },
    {
      name: "getting-started-customized",
      source: "Getting Started (after Customization)",
      files: gettingStarted.customized,
    },
    {
      name: "core-readme",
      source: "lib/core/README.md",
      files: extractReadmeProject(readFileSync(CORE_README, "utf-8")),
    },
  ];

  const tspEntry = tspEntryPath();
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  let failed = 0;
  try {
    for (const quickstart of quickstarts) {
      const error = compileQuickstart(quickstart, tspEntry);
      if (error) {
        failed++;
        console.error(
          `✗ ${quickstart.source} quickstart failed to compile:\n${error}\n`,
        );
      } else {
        console.log(`✓ ${quickstart.source} quickstart compiles`);
      }
    }
  } finally {
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }

  if (failed > 0) {
    console.error(
      `${failed} of ${quickstarts.length} quickstarts failed to compile.`,
    );
    process.exit(1);
  }
}

main();
