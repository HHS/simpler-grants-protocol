import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { Paths } from "../lib/schema/paths";
import { MOCK_SPEC_DIR_NAME, serverUrlFor } from "../lib/mock/docs-wiring";
import {
  SUPPORTED_VERSIONS,
  isSupportedVersion,
} from "../lib/mock/data/fixtures";

/**
 * Build-time script that copies each rendered OpenAPI spec into
 * `public/openapi-mock/` with a `servers:` block pointing at the mock, which is
 * how Swagger UI's "Try it out" finds it. Injection is targeted string
 * insertion, not a YAML parse/dump, which would rewrite the whole file.
 *
 * The copies live in a gitignored sibling directory rather than replacing
 * `public/openapi/` in place: those specs are generated from the TypeSpec
 * source and tracked, so rewriting them left the working tree carrying
 * artifacts that must never be committed.
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

/**
 * Guards the drift this script can otherwise cause: it advertises a server for
 * every emitted spec it finds, but the router only serves the versions the
 * fixtures know how to shape. Without this, adding a protocol version to
 * `lib/core` would ship a docs page whose every Execute answers 404, with
 * nothing failing at build time to say so.
 */
export function assertMockServesVersion(
  version: string,
  filename: string,
): void {
  if (isSupportedVersion(version)) return;

  throw new Error(
    `${filename} would advertise ${serverUrlFor(version)}, which the mock router does not serve ` +
      `(it serves ${SUPPORTED_VERSIONS.join(", ")}). Teach src/lib/mock/data/fixtures.ts to shape ` +
      `v${version} — SUPPORTED_VERSIONS and shapeOpportunityForVersion — before emitting a spec for it.`,
  );
}

/** Where the mock-advertising copies go. Gitignored; regenerated per build. */
const MOCK_SPEC_DIR = join(Paths.PUBLIC_DIR, MOCK_SPEC_DIR_NAME);

/** Outcome of a run. */
export interface InjectResult {
  /** Filenames processed, in sorted order. */
  written: string[];
}

class MockServerInjector {
  /**
   * Copies every versioned spec in `Paths.OPENAPI_DIR` into `MOCK_SPEC_DIR`
   * advertising the mock.
   */
  static inject(): InjectResult {
    // Cleared first so a dropped spec can't linger as a stale copy.
    rmSync(MOCK_SPEC_DIR, { recursive: true, force: true });

    console.log("Injecting same-origin mock server into OpenAPI specs...");

    // Two passes so writes are all-or-nothing: an anchor failure throws
    // before any file has been written.
    const planned: { filename: string; updated: string }[] = [];

    for (const filename of readdirSync(Paths.OPENAPI_DIR).sort()) {
      const version = versionFromSpecFilename(filename);
      if (version === null) {
        continue;
      }

      assertMockServesVersion(version, filename);

      const serverUrl = serverUrlFor(version);
      const source = join(Paths.OPENAPI_DIR, filename);

      planned.push({
        filename,
        updated: injectServers(readFileSync(source, "utf-8"), serverUrl),
      });
      console.log(`  ${filename} -> ${serverUrl}`);
    }

    if (planned.length === 0) {
      throw new Error(
        `No versioned specs found in ${Paths.OPENAPI_DIR} — run \`pnpm typespec\` first`,
      );
    }

    mkdirSync(MOCK_SPEC_DIR, { recursive: true });
    for (const { filename, updated } of planned) {
      writeFileSync(join(MOCK_SPEC_DIR, filename), updated, "utf-8");
    }

    const written = planned.map(({ filename }) => filename);

    console.log(
      `\n✓ Wrote ${written.length} mock-advertising spec(s) to public/${MOCK_SPEC_DIR_NAME}/`,
    );

    return { written };
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
