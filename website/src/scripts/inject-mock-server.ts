import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Paths } from "../lib/schema/paths";
import { isMockApiEnabled, serverUrlFor } from "../lib/mock/docs-wiring";

/**
 * Build-time script that writes a `servers:` block pointing at the mock into
 * each rendered OpenAPI spec, which is how Swagger UI's "Try it out" finds it.
 * No-op unless `MOCK_API_ENABLED` is set (see `lib/mock/docs-wiring.ts`).
 * Injection is targeted string insertion, not a YAML parse/dump, which would
 * rewrite the whole file.
 */

/** `openapi.0.4.0.yaml` — the emitted per-version spec files. */
const SPEC_FILENAME = /^openapi\.(\d+\.\d+\.\d+)\.yaml$/;

/**
 * A top-level `servers:` key and its indented body. Anchored to line start so
 * a nested `servers:` never matches.
 */
const TOP_LEVEL_SERVERS = /^servers:[^\n]*\n(?:[ \t][^\n]*\n|-[^\n]*\n)*/m;

/** Anchor for insertion: the specs' first top-level `paths:` key. */
const TOP_LEVEL_PATHS = /^paths:/m;

/**
 * Extracts the protocol version from a spec filename
 * (`openapi.0.4.0.yaml` → `"0.4.0"`), or null.
 */
export function versionFromSpecFilename(filename: string): string | null {
  return SPEC_FILENAME.exec(filename)?.[1] ?? null;
}

/**
 * Inserts a `servers:` block immediately before the spec's top-level `paths:`
 * key. Idempotent: an existing block is replaced, not duplicated. Throws when
 * there is no `paths:` key to anchor against.
 */
export function injectServers(yamlText: string, serverUrl: string): string {
  const withoutExisting = yamlText.replace(TOP_LEVEL_SERVERS, "");

  if (!TOP_LEVEL_PATHS.test(withoutExisting)) {
    throw new Error(
      "Spec has no top-level `paths:` key to anchor `servers:` to",
    );
  }

  const block = `servers:\n  - url: ${serverUrl}\n`;
  // Function replacement so a `$` in the URL can't be read as a capture group.
  return withoutExisting.replace(TOP_LEVEL_PATHS, () => `${block}paths:`);
}

/** Outcome of a run, so callers (and tests) can assert the no-op path. */
export interface InjectResult {
  /** True when `MOCK_API_ENABLED` was unset and nothing was written. */
  skipped: boolean;
  /** Filenames processed, in sorted order. */
  written: string[];
}

class MockServerInjector {
  /**
   * Rewrites every versioned spec in `Paths.OPENAPI_DIR` to advertise the
   * mock; skipped when the gate is off.
   */
  static inject(): InjectResult {
    if (!isMockApiEnabled()) {
      console.log(
        "MOCK_API_ENABLED not set — leaving OpenAPI specs untouched (no mock server injected).",
      );
      return { skipped: true, written: [] };
    }

    console.log("Injecting same-origin mock server into OpenAPI specs...");

    // Two passes so writes are all-or-nothing: an anchor failure throws
    // before any file has been written.
    const planned: { filename: string; specPath: string; updated: string }[] =
      [];

    for (const filename of readdirSync(Paths.OPENAPI_DIR).sort()) {
      const version = versionFromSpecFilename(filename);
      if (version === null) {
        continue;
      }

      const specPath = join(Paths.OPENAPI_DIR, filename);
      const serverUrl = serverUrlFor(version);

      planned.push({
        filename,
        specPath,
        updated: injectServers(readFileSync(specPath, "utf-8"), serverUrl),
      });
      console.log(`  ${filename} -> ${serverUrl}`);
    }

    if (planned.length === 0) {
      throw new Error(
        `No versioned specs found in ${Paths.OPENAPI_DIR} — run \`pnpm typespec\` first`,
      );
    }

    for (const { specPath, updated } of planned) {
      writeFileSync(specPath, updated, "utf-8");
    }

    const written = planned.map(({ filename }) => filename);

    // `public/openapi/*.yaml` are TRACKED files rewritten in place — they must
    // not be committed with the mock's `servers:` block.
    console.log(`\n✓ Injected mock server into ${written.length} spec(s)`);
    console.log(
      "⚠ public/openapi/*.yaml are tracked files and have been rewritten in place.\n" +
        "  Do not commit them — run `git checkout -- website/public/openapi/` first.",
    );

    return { skipped: false, written };
  }
}

// Run the injector if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    MockServerInjector.inject();
  } catch (error) {
    console.error("Failed to inject mock server:", error);
    process.exit(1);
  }
}

export { MockServerInjector };
