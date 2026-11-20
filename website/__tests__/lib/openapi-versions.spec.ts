/**
 * Tests for `src/lib/openapi-versions.ts`: the API docs version dropdown is
 * built from the generated OpenAPI documents, not a hand-typed list.
 */

import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiDocsVersions,
  apiDocsVersionsFromFilenames,
  versionFromSpecFilename,
} from "@/lib/openapi-versions";

describe("versionFromSpecFilename", () => {
  it("extracts the version from a versioned spec filename", () => {
    expect(versionFromSpecFilename("openapi.0.6.0.yaml")).toBe("0.6.0");
  });

  it("returns null for other files", () => {
    expect(versionFromSpecFilename("openapi.yaml")).toBeNull();
    expect(versionFromSpecFilename("openapi.0.6.0.json")).toBeNull();
  });
});

describe("apiDocsVersionsFromFilenames", () => {
  it("sorts versions numerically, newest first", () => {
    const versions = apiDocsVersionsFromFilenames([
      "openapi.0.2.0.yaml",
      "openapi.0.10.0.yaml",
      "openapi.0.9.1.yaml",
      "openapi.1.0.0.yaml",
      "openapi.0.9.10.yaml",
    ]).map(({ version }) => version);

    expect(versions).toEqual(["1.0.0", "0.10.0", "0.9.10", "0.9.1", "0.2.0"]);
  });

  it("labels only the newest version as latest", () => {
    expect(
      apiDocsVersionsFromFilenames([
        "openapi.0.5.0.yaml",
        "openapi.0.6.0.yaml",
      ]),
    ).toEqual([
      { version: "0.6.0", label: "v0.6.0 (Latest)" },
      { version: "0.5.0", label: "v0.5.0" },
    ]);
  });

  it("ignores files that aren't versioned specs", () => {
    expect(
      apiDocsVersionsFromFilenames([
        "README.md",
        "openapi.yaml",
        "openapi.0.6.0.yaml",
        "openapi.0.6.yaml",
      ]),
    ).toEqual([{ version: "0.6.0", label: "v0.6.0 (Latest)" }]);
  });

  it("throws when no versioned spec is found", () => {
    expect(() => apiDocsVersionsFromFilenames(["README.md"])).toThrow(
      /No versioned OpenAPI documents/,
    );
    expect(() => apiDocsVersionsFromFilenames([])).toThrow(
      /No versioned OpenAPI documents/,
    );
  });
});

describe("apiDocsVersions", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("reads the versioned specs from a directory", () => {
    dir = mkdtempSync(join(tmpdir(), "openapi-versions-"));
    for (const name of ["openapi.0.1.0.yaml", "openapi.0.6.0.yaml", "x.txt"]) {
      writeFileSync(join(dir, name), "");
    }

    expect(apiDocsVersions(dir)).toEqual([
      { version: "0.6.0", label: "v0.6.0 (Latest)" },
      { version: "0.1.0", label: "v0.1.0" },
    ]);
  });

  it("throws, naming the directory, when it holds no versioned spec", () => {
    dir = mkdtempSync(join(tmpdir(), "openapi-versions-"));

    expect(() => apiDocsVersions(dir!)).toThrow(
      new RegExp(`${dir}.*No versioned OpenAPI documents`),
    );
  });
});
