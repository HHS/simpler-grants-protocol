/**
 * Tests for `src/scripts/check-published-openapi.ts` (#1392): which documents
 * count as published, and when the check fails.
 */

import { describe, it, expect } from "vitest";
import {
  baseRefFromArgv,
  classifyChange,
  compareSemver,
  decideOutcome,
  dedupeResults,
  overrideFromInputs,
  selectPublishedDocuments,
  versionFromFilename,
  OVERRIDE_LABEL,
  type DocumentResult,
} from "@/scripts/check-published-openapi";

const dir = "website/public/openapi";
const files = (...versions: string[]) =>
  versions.map((v) => `${dir}/openapi.${v}.yaml`);

describe("versionFromFilename", () => {
  it("reads the version from a document filename", () => {
    expect(versionFromFilename(`${dir}/openapi.0.5.0.yaml`)).toBe("0.5.0");
    expect(versionFromFilename("openapi.10.2.31.yaml")).toBe("10.2.31");
  });

  it("ignores other files", () => {
    expect(versionFromFilename(`${dir}/README.md`)).toBeNull();
    expect(versionFromFilename("openapi.yaml")).toBeNull();
    expect(versionFromFilename("openapi.0.5.yaml")).toBeNull();
  });
});

describe("compareSemver", () => {
  it("compares numerically, not as strings", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareSemver("0.5.0", "0.6.0")).toBeLessThan(0);
    expect(compareSemver("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareSemver("0.5.0", "0.5.0")).toBe(0);
  });

  it("ignores pre-release and build suffixes", () => {
    expect(compareSemver("0.6.0-rc.1", "0.6.0")).toBe(0);
  });

  it("rejects non-versions", () => {
    expect(() => compareSemver("latest", "0.5.0")).toThrow();
  });
});

describe("selectPublishedDocuments", () => {
  it("covers every version up to core's released version", () => {
    const published = selectPublishedDocuments(
      files("0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"),
      "0.5.0",
    );
    expect(published.map((d) => d.version)).toEqual([
      "0.1.0",
      "0.2.0",
      "0.3.0",
      "0.4.0",
      "0.5.0",
    ]);
    expect(published[0].path).toBe(`${dir}/openapi.0.1.0.yaml`);
  });

  it("leaves out a hold branch's next version until core's version moves", () => {
    const onHold = files("0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.6.0");
    expect(
      selectPublishedDocuments(onHold, "0.5.0").map((d) => d.version),
    ).not.toContain("0.6.0");
    expect(
      selectPublishedDocuments(onHold, "0.6.0").map((d) => d.version),
    ).toContain("0.6.0");
  });

  it("sorts by version and skips unrelated files", () => {
    const published = selectPublishedDocuments(
      [...files("0.10.0", "0.2.0", "0.9.0"), `${dir}/notes.txt`],
      "0.10.0",
    );
    expect(published.map((d) => d.version)).toEqual([
      "0.2.0",
      "0.9.0",
      "0.10.0",
    ]);
  });
});

describe("classifyChange", () => {
  it("classifies unchanged, changed and deleted documents", () => {
    expect(classifyChange("a\n", "a\n")).toBe("unchanged");
    expect(classifyChange("a\n", "b\n")).toBe("changed");
    expect(classifyChange("a\n", null)).toBe("deleted");
  });
});

const result = (
  overrides: Partial<DocumentResult> & Pick<DocumentResult, "path">,
): DocumentResult => ({
  phase: "committed",
  change: "changed",
  diff: "--- a\n+++ b\n-old\n+new\n",
  ...overrides,
});

describe("dedupeResults", () => {
  it("drops a regenerated diff that repeats the committed one", () => {
    const path = `${dir}/openapi.0.3.0.yaml`;
    const deduped = dedupeResults([
      result({ path }),
      result({ path, phase: "regenerated" }),
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].phase).toBe("committed");
  });

  it("keeps a regenerated diff that differs from the committed one", () => {
    const path = `${dir}/openapi.0.3.0.yaml`;
    const deduped = dedupeResults([
      result({ path }),
      result({ path, phase: "regenerated", diff: "other" }),
    ]);
    expect(deduped).toHaveLength(2);
  });
});

describe("decideOutcome", () => {
  const published = selectPublishedDocuments(files("0.4.0", "0.5.0"), "0.5.0");

  it("passes when nothing changed", () => {
    const outcome = decideOutcome({
      baseRef: "origin/main",
      published,
      results: [],
      overrideAllowed: false,
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.report).toContain("0.4.0, 0.5.0");
  });

  it("fails, names each changed document and shows its diff", () => {
    const outcome = decideOutcome({
      baseRef: "origin/main",
      published,
      results: [
        result({ path: `${dir}/openapi.0.4.0.yaml`, phase: "regenerated" }),
        result({ path: `${dir}/openapi.0.5.0.yaml`, change: "deleted" }),
      ],
      overrideAllowed: false,
    });
    expect(outcome.exitCode).toBe(1);
    expect(outcome.report).toContain(`\`${dir}/openapi.0.4.0.yaml\` changed`);
    expect(outcome.report).toContain(`\`${dir}/openapi.0.5.0.yaml\` deleted`);
    expect(outcome.report).toContain("+new");
    expect(outcome.report).toContain("@returnTypeChangedFrom");
    expect(outcome.report).toContain(OVERRIDE_LABEL);
  });

  it("passes with the override but still shows every diff", () => {
    const outcome = decideOutcome({
      baseRef: "origin/main",
      published,
      results: [result({ path: `${dir}/openapi.0.4.0.yaml` })],
      overrideAllowed: true,
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.report).toContain(`allowed by the \`${OVERRIDE_LABEL}\``);
    expect(outcome.report).toContain("+new");
  });

  it("truncates long diffs when asked, for the step summary", () => {
    const long = Array.from({ length: 50 }, (_, i) => `+line ${i}`).join("\n");
    const outcome = decideOutcome({
      baseRef: "origin/main",
      published,
      results: [result({ path: `${dir}/openapi.0.4.0.yaml`, diff: long })],
      overrideAllowed: false,
      maxDiffLines: 10,
    });
    expect(outcome.report).toContain("+line 9");
    expect(outcome.report).not.toContain("+line 10");
    expect(outcome.report).toContain("40 more lines");
  });

  it("notes when the committed change also shows after regeneration", () => {
    const path = `${dir}/openapi.0.4.0.yaml`;
    const outcome = decideOutcome({
      baseRef: "origin/main",
      published,
      results: [result({ path }), result({ path, phase: "regenerated" })],
      overrideAllowed: false,
    });
    expect(outcome.report.match(/```diff/g)).toHaveLength(1);
    expect(outcome.report).toContain("same diff after regeneration");
  });
});

describe("inputs", () => {
  it("reads the override from the flag or the environment", () => {
    expect(overrideFromInputs(["--allow-changes"], {})).toBe(true);
    expect(
      overrideFromInputs([], { PUBLISHED_OPENAPI_CHANGE_ALLOWED: "true" }),
    ).toBe(true);
    expect(
      overrideFromInputs([], { PUBLISHED_OPENAPI_CHANGE_ALLOWED: "false" }),
    ).toBe(false);
    expect(overrideFromInputs([], {})).toBe(false);
  });

  it("reads the base ref, defaulting to origin/main", () => {
    expect(baseRefFromArgv([])).toBe("origin/main");
    expect(baseRefFromArgv(["--base", "origin/CORE-v0.6.0"])).toBe(
      "origin/CORE-v0.6.0",
    );
    expect(() => baseRefFromArgv(["--base"])).toThrow();
  });
});
