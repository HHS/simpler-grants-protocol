import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * Fails when a published OpenAPI document changes (#1392).
 *
 * A document is published when `website/public/openapi/openapi.<v>.yaml`
 * exists on the base ref and `<v>` is at or below the version in the base
 * ref's `lib/core/package.json`. A hold branch can add the next version's
 * document before the release bumps core's version, so that document isn't
 * covered until the release merges.
 *
 * Each published document is compared with the base ref's copy twice: as
 * committed (catches hand edits and deletions), then after regenerating with
 * `pnpm run typespec` (catches TypeSpec changes that alter older versions).
 * Regenerating overwrites `public/openapi/` in the working tree.
 *
 * Usage (from `website/`):
 *   tsx src/scripts/check-published-openapi.ts [--base <ref>] [--allow-changes] [--no-regenerate]
 *
 * `--allow-changes`, or `PUBLISHED_OPENAPI_CHANGE_ALLOWED=true`, still prints
 * every diff but exits 0. CI sets it when the PR has the
 * `published-openapi-change` label.
 *
 * `--no-regenerate` skips the regeneration pass and compares only the
 * committed documents.
 */

export const OVERRIDE_LABEL = "published-openapi-change";
export const OPENAPI_DIR = "website/public/openapi";
export const CORE_PACKAGE_JSON = "lib/core/package.json";

const FILENAME_PATTERN = /^openapi\.(\d+)\.(\d+)\.(\d+)\.yaml$/;

// ############################################################
// Pure logic
// ############################################################

/** The version in an `openapi.<v>.yaml` filename, or null for any other file. */
export function versionFromFilename(filename: string): string | null {
  const match = FILENAME_PATTERN.exec(path.basename(filename));
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

/** Compares two `major.minor.patch` versions; pre-release suffixes are ignored. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const core = v.trim().replace(/^v/, "").split(/[-+]/)[0];
    const parts = core.split(".").map((p) => Number(p));
    if (
      parts.length !== 3 ||
      parts.some((p) => !Number.isInteger(p) || p < 0)
    ) {
      throw new Error(`Not a semver version: "${v}"`);
    }
    return parts;
  };
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export interface PublishedDocument {
  version: string;
  /** Repo-relative path, e.g. `website/public/openapi/openapi.0.5.0.yaml`. */
  path: string;
}

/**
 * The published documents: those on the base ref whose version is at or
 * below core's released version, oldest first.
 */
export function selectPublishedDocuments(
  baseFiles: string[],
  coreVersion: string,
): PublishedDocument[] {
  return baseFiles
    .map((file) => ({ file, version: versionFromFilename(file) }))
    .filter(
      (entry): entry is { file: string; version: string } =>
        entry.version !== null &&
        compareSemver(entry.version, coreVersion) <= 0,
    )
    .sort((a, b) => compareSemver(a.version, b.version))
    .map(({ file, version }) => ({
      version,
      path: `${OPENAPI_DIR}/${path.basename(file)}`,
    }));
}

export type Phase = "committed" | "regenerated";
export type Change = "unchanged" | "changed" | "deleted";

/** How a document differs from the base ref's copy; `current` is null when missing. */
export function classifyChange(base: string, current: string | null): Change {
  if (current === null) return "deleted";
  return current === base ? "unchanged" : "changed";
}

export interface DocumentResult {
  path: string;
  phase: Phase;
  change: Exclude<Change, "unchanged">;
  /** Unified diff against the base ref's copy. */
  diff: string;
}

/**
 * Drops a regenerated-phase result that repeats a committed-phase result for
 * the same document, so the same diff isn't printed twice.
 */
export function dedupeResults(results: DocumentResult[]): DocumentResult[] {
  const committed = new Map(
    results
      .filter((r) => r.phase === "committed")
      .map((r) => [r.path, r] as const),
  );
  return results.filter((r) => {
    if (r.phase !== "regenerated") return true;
    const earlier = committed.get(r.path);
    return !(earlier && earlier.change === r.change && earlier.diff === r.diff);
  });
}

export interface Outcome {
  exitCode: 0 | 1;
  /** Markdown report, also used for `$GITHUB_STEP_SUMMARY`. */
  report: string;
}

const PHASE_LABEL: Record<Phase, string> = {
  committed: "committed file",
  regenerated: "after `pnpm --filter website run typespec`",
};

/** The exit code and report for a run. */
export function decideOutcome(args: {
  baseRef: string;
  published: PublishedDocument[];
  results: DocumentResult[];
  overrideAllowed: boolean;
  /** Truncate each diff to this many lines (for `$GITHUB_STEP_SUMMARY`). */
  maxDiffLines?: number;
}): Outcome {
  const { baseRef, published, overrideAllowed } = args;
  const results = dedupeResults(args.results);
  const covered = published.map((d) => d.version).join(", ") || "none";

  if (results.length === 0) {
    return {
      exitCode: 0,
      report:
        `## Published OpenAPI documents unchanged\n\n` +
        `Compared with \`${baseRef}\`. Published versions: ${covered}.\n`,
    };
  }

  const changedPaths = [...new Set(results.map((r) => r.path))];
  const sections = results.map((r) => {
    const what = r.change === "deleted" ? "deleted" : "changed";
    const both =
      r.phase === "committed" &&
      args.results.some(
        (o) => o.path === r.path && o.phase === "regenerated",
      ) &&
      !results.some((o) => o.path === r.path && o.phase === "regenerated");
    const phase = both
      ? `${PHASE_LABEL.committed}; same diff after regeneration`
      : PHASE_LABEL[r.phase];
    const body = r.diff
      ? `\n\`\`\`diff\n${truncateLines(r.diff.trimEnd(), args.maxDiffLines)}\n\`\`\`\n`
      : "\n";
    return `### \`${r.path}\` ${what} (${phase})\n${body}`;
  });

  const header = overrideAllowed
    ? `## Published OpenAPI documents changed (allowed by the \`${OVERRIDE_LABEL}\` label)`
    : `## Published OpenAPI documents changed`;
  const advice = overrideAllowed
    ? `The \`${OVERRIDE_LABEL}\` label allows these changes. Say in the PR why they're intended.`
    : `To proceed, fix the TypeSpec so older versions keep their shape (versioning decorators such as \`@returnTypeChangedFrom\`), ` +
      `or, if the change is deliberate, add the \`${OVERRIDE_LABEL}\` label and say why in the PR.`;

  const report =
    `${header}\n\n` +
    `Compared with \`${baseRef}\`. Published versions: ${covered}.\n\n` +
    `Changed: ${changedPaths.map((p) => `\`${p}\``).join(", ")}\n\n` +
    `${advice}\n\n` +
    sections.join("\n");

  return { exitCode: overrideAllowed ? 0 : 1, report };
}

function truncateLines(text: string, max: number | undefined): string {
  const lines = text.split("\n");
  if (max === undefined || lines.length <= max) return text;
  return [
    ...lines.slice(0, max),
    `... ${lines.length - max} more lines; see the job log for the full diff`,
  ].join("\n");
}

/** True for `--allow-changes` or a truthy `PUBLISHED_OPENAPI_CHANGE_ALLOWED`. */
export function overrideFromInputs(
  argv: string[],
  env: Record<string, string | undefined>,
): boolean {
  if (argv.includes("--allow-changes")) return true;
  const value = env.PUBLISHED_OPENAPI_CHANGE_ALLOWED?.trim().toLowerCase();
  return value === "true" || value === "1";
}

/** The base ref from `--base <ref>`, defaulting to `origin/main`. */
export function baseRefFromArgv(argv: string[]): string {
  const index = argv.indexOf("--base");
  if (index === -1) return "origin/main";
  const ref = argv[index + 1];
  if (!ref || ref.startsWith("--")) throw new Error("--base needs a ref");
  return ref;
}

// ############################################################
// Git and filesystem
// ############################################################

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Unified diff of the base ref's copy against the working-tree file, with
 * `a/<path>` and `b/<path>` labels. The flags and `-c` settings pin the
 * output so local git config (external diff tools, textconv, prefixes,
 * context size, algorithm) can't change it.
 */
function unifiedDiff(
  repoRoot: string,
  baseRef: string,
  docPath: string,
): string {
  return git(repoRoot, [
    "-c",
    "diff.suppressBlankEmpty=false",
    "diff",
    "--no-color",
    "--no-ext-diff",
    "--no-textconv",
    "--no-relative",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    "--unified=3",
    "--inter-hunk-context=0",
    "--diff-algorithm=myers",
    "--indent-heuristic",
    baseRef,
    "--",
    docPath,
  ]);
}

function checkPhase(
  repoRoot: string,
  phase: Phase,
  docs: PublishedDocument[],
  baseRef: string,
  baseTexts: Map<string, string>,
): DocumentResult[] {
  const results: DocumentResult[] = [];
  for (const doc of docs) {
    const base = baseTexts.get(doc.path)!;
    const file = path.join(repoRoot, doc.path);
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    const change = classifyChange(base, current);
    if (change === "unchanged") continue;
    results.push({
      path: doc.path,
      phase,
      change,
      // A deletion is named in the heading; its diff would only repeat the whole file.
      diff: current === null ? "" : unifiedDiff(repoRoot, baseRef, doc.path),
    });
  }
  return results;
}

function main(): void {
  const argv = process.argv.slice(2);
  const baseRef = baseRefFromArgv(argv);
  const overrideAllowed = overrideFromInputs(argv, process.env);
  const regenerate = !argv.includes("--no-regenerate");
  const repoRoot = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();

  const coreVersion = JSON.parse(
    git(repoRoot, ["show", `${baseRef}:${CORE_PACKAGE_JSON}`]),
  ).version as string;
  const baseFiles = git(repoRoot, [
    "ls-tree",
    "--name-only",
    baseRef,
    `${OPENAPI_DIR}/`,
  ])
    .split("\n")
    .filter(Boolean);
  const published = selectPublishedDocuments(baseFiles, coreVersion);
  const baseTexts = new Map(
    published.map((d) => [
      d.path,
      git(repoRoot, ["show", `${baseRef}:${d.path}`]),
    ]),
  );

  console.log(
    `Base ${baseRef}: core ${coreVersion}; published versions ${published.map((d) => d.version).join(", ") || "none"}`,
  );

  const results = checkPhase(
    repoRoot,
    "committed",
    published,
    baseRef,
    baseTexts,
  );
  if (regenerate) {
    console.log("Regenerating with `pnpm run typespec`...");
    execFileSync("pnpm", ["run", "typespec"], {
      cwd: path.join(repoRoot, "website"),
      stdio: "inherit",
    });
    results.push(
      ...checkPhase(repoRoot, "regenerated", published, baseRef, baseTexts),
    );
  }

  const outcome = { baseRef, published, results, overrideAllowed };
  const { exitCode, report } = decideOutcome(outcome);
  console.log(`\n${report}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    // GitHub rejects step summaries over 1 MiB, so cap each diff there.
    const summary = decideOutcome({ ...outcome, maxDiffLines: 200 }).report;
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, {
      flag: "a",
    });
  }
  process.exit(exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error("Failed to check the published OpenAPI documents:", error);
    process.exit(1);
  }
}
