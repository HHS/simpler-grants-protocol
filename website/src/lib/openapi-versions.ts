import { readdirSync } from "fs";

/** `openapi.0.4.0.yaml` — the emitted per-version spec files. */
const SPEC_FILENAME = /^openapi\.(\d+\.\d+\.\d+)\.yaml$/;

/**
 * Extracts the protocol version from a spec filename
 * (`openapi.0.4.0.yaml` → `"0.4.0"`), or null.
 */
export function versionFromSpecFilename(filename: string): string | null {
  return SPEC_FILENAME.exec(filename)?.[1] ?? null;
}

/** One option in the API docs version dropdown. */
export interface ApiDocsVersion {
  /** Bare version, e.g. `"0.6.0"`. */
  version: string;
  /** Text shown in the dropdown, e.g. `"v0.6.0 (Latest)"`. */
  label: string;
}

/** Compares two `MAJOR.MINOR.PATCH` versions numerically, newest first. */
function newestFirst(a: string, b: string): number {
  const [aParts, bParts] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) {
    if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
  }
  return 0;
}

/**
 * Builds the API docs version dropdown from the spec filenames in a
 * directory: every `openapi.X.Y.Z.yaml`, newest first, with the newest
 * labelled `(Latest)`. Other files are ignored.
 *
 * @param filenames - Filenames from the OpenAPI directory.
 * @throws When no filename is a versioned spec.
 */
export function apiDocsVersionsFromFilenames(
  filenames: string[],
): ApiDocsVersion[] {
  const versions = filenames
    .map(versionFromSpecFilename)
    .filter((v): v is string => v !== null)
    .sort(newestFirst);

  if (versions.length === 0) {
    throw new Error(
      "No versioned OpenAPI documents (openapi.X.Y.Z.yaml) found for the API docs " +
        "version dropdown — run `pnpm typespec` first",
    );
  }

  return versions.map((version, i) => ({
    version,
    label: i === 0 ? `v${version} (Latest)` : `v${version}`,
  }));
}

/**
 * Reads `dir` and builds the API docs version dropdown from its versioned
 * OpenAPI documents. See `apiDocsVersionsFromFilenames`.
 *
 * @throws When `dir` holds no versioned spec.
 */
export function apiDocsVersions(dir: string): ApiDocsVersion[] {
  try {
    return apiDocsVersionsFromFilenames(readdirSync(dir));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`API docs version dropdown, reading ${dir}: ${reason}`, {
      cause: error,
    });
  }
}
