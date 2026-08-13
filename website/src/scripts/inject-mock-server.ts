import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Paths } from "../lib/schema/paths";
import { isMockApiEnabled, serverUrlFor } from "../lib/mock/docs-wiring";

/**
 * Build-time script to point the rendered OpenAPI specs at this site's own mock
 * endpoint (#1078-T2).
 *
 * Swagger UI reads its base URL from the spec's own `servers:` block, so this is
 * how the mock reaches the docs "Try it out" panel and the `curl` command it
 * offers to copy. Gated on `MOCK_API_ENABLED` — set by the PR-preview build,
 * absent in production — so with it unset this is a no-op and the specs are
 * byte-identical, keeping GitHub Pages exactly as it is today. See
 * `lib/mock/docs-wiring.ts` for why the wiring is gated and why the URL is
 * relative.
 *
 * Injection is targeted string insertion, not a `js-yaml` parse/dump round-trip.
 * Dumping would reorder keys, restyle block scalars, and re-wrap the long
 * descriptions throughout a ~2000-line file, turning a one-line change into a diff
 * no one can review.
 *
 * Ported from the standalone-Worker experiment's script of the same name
 * (#1077-T6); the string surgery below is unchanged, while the URL it writes is
 * now same-origin and the gate is a boolean rather than a URL.
 */

/** `openapi.0.4.0.yaml` — the emitted per-version spec files. */
const SPEC_FILENAME = /^openapi\.(\d+\.\d+\.\d+)\.yaml$/;

/**
 * A top-level `servers:` key and its indented body.
 *
 * Anchored to line start so an indented `servers:` nested inside an operation is
 * never matched. The body is any run of following lines that begin with
 * whitespace or a list dash.
 */
const TOP_LEVEL_SERVERS = /^servers:[^\n]*\n(?:[ \t][^\n]*\n|-[^\n]*\n)*/m;

/** Anchor for insertion: the specs' first top-level `paths:` key. */
const TOP_LEVEL_PATHS = /^paths:/m;

/**
 * Extracts the protocol version from an emitted spec filename.
 *
 * @param filename - A bare filename, e.g. `openapi.0.4.0.yaml`.
 * @returns The version (`"0.4.0"`), or null if the name isn't a versioned spec.
 */
export function versionFromSpecFilename(filename: string): string | null {
  return SPEC_FILENAME.exec(filename)?.[1] ?? null;
}

/**
 * Inserts a `servers:` block into a spec, immediately before its `paths:` key.
 *
 * Idempotent: an existing top-level `servers:` block is replaced rather than
 * duplicated, so re-running `generate` without re-compiling TypeSpec is safe.
 * Every other line is preserved byte-for-byte.
 *
 * @param yamlText - The spec's full text.
 * @param serverUrl - The URL to advertise.
 * @returns The spec with exactly one top-level `servers:` block.
 * @throws If the spec has no top-level `paths:` key to anchor against.
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
   * Rewrites every versioned spec in `Paths.OPENAPI_DIR` to advertise the mock.
   *
   * @returns Which files were touched, or `skipped` when the gate is off.
   */
  static inject(): InjectResult {
    if (!isMockApiEnabled()) {
      console.log(
        "MOCK_API_ENABLED not set — leaving OpenAPI specs untouched (no mock server injected).",
      );
      return { skipped: true, written: [] };
    }

    console.log("Injecting same-origin mock server into OpenAPI specs...");

    // Two passes so the write step is all-or-nothing across the directory: a spec
    // that can't be anchored throws before anything has been written, rather than
    // leaving some files rewritten and others not.
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

    // `public/openapi/*.yaml` are tracked, not gitignored, so this leaves them
    // showing as modified in git. Harmless in CI (ephemeral checkout) but a real
    // trap locally: committing them would publish the mock's `servers:` block in
    // the real specs.
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
