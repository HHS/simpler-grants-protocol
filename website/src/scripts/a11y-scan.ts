/**
 * Accessibility scan for the built website.
 *
 * Serves the static build in `dist/client`, opens each page listed in
 * `a11y/pages.txt` in headless Chromium, and runs axe against WCAG 2.1 AA.
 * Exits non-zero when a page has a "serious" or "critical" violation that
 * isn't listed in `a11y/exceptions.txt`, or when a page fails to load.
 *
 * Run `pnpm run build` first, then `pnpm run check:a11y`. See README.md.
 */
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import type { AddressInfo } from "net";
import { chromium, type Browser } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { Paths } from "../lib/schema/paths";
import {
  WCAG_21_AA_TAGS,
  compareResults,
  exceptionLine,
  parseExceptions,
  parsePages,
  type Comparison,
  type ConfigError,
  type Violation,
} from "../lib/a11y/config";

const A11Y_DIR = path.join(Paths.WEBSITE_ROOT, "a11y");
const PAGES_FILE = path.join(A11Y_DIR, "pages.txt");
const EXCEPTIONS_FILE = path.join(A11Y_DIR, "exceptions.txt");
const CLIENT_DIR = path.join(Paths.WEBSITE_ROOT, "dist", "client");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
};

/** Maps a URL path to a file in the build, the way the static host does. */
function resolveFile(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const candidate = path.resolve(root, "." + decoded);
  // Refuse anything that escapes the build directory.
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  const options = [
    candidate,
    path.join(candidate, "index.html"),
    candidate + ".html",
  ];
  return (
    options.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ??
    null
  );
}

/** Starts a static file server for the build on a free localhost port. */
async function serveBuild(root: string): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
    const file = resolveFile(root, urlPath);
    if (!file) {
      const notFound = path.join(root, "404.html");
      res.writeHead(404, { "Content-Type": CONTENT_TYPES[".html"] });
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "");
      return;
    }
    const type =
      CONTENT_TYPES[path.extname(file).toLowerCase()] ??
      "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  return server;
}

interface PageResult {
  page: string;
  violations: Violation[];
  /** Set when the page didn't load, which fails the check. */
  loadError?: string;
}

async function scanPage(
  browser: Browser,
  origin: string,
  page: string,
): Promise<PageResult> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  try {
    // Only the local build is scanned. Third-party requests (analytics) are
    // blocked so results don't depend on the network.
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    const tab = await context.newPage();
    const response = await tab.goto(origin + page, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    if (!response || !response.ok()) {
      return {
        page,
        violations: [],
        loadError: `HTTP ${response?.status() ?? "no response"}`,
      };
    }
    const results = await new AxeBuilder({ page: tab })
      .withTags(WCAG_21_AA_TAGS)
      .analyze();
    return {
      page,
      violations: results.violations.map((v) => ({
        page,
        rule: v.id,
        impact: v.impact ?? null,
        help: v.help,
        helpUrl: v.helpUrl,
        targets: v.nodes.map((n) => n.target.join(" ")),
      })),
    };
  } catch (error) {
    return {
      page,
      violations: [],
      loadError: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await context.close();
  }
}

function relative(file: string): string {
  return path.relative(Paths.WEBSITE_ROOT, file);
}

/** Escapes text for a GitHub Actions workflow command. */
function escapeAnnotation(text: string): string {
  return text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

const inActions = process.env.GITHUB_ACTIONS === "true";

function annotate(
  level: "error" | "warning",
  message: string,
  file?: string,
  line?: number,
): void {
  if (!inActions) return;
  const location = file
    ? ` file=website/${relative(file)}${line ? `,line=${line}` : ""}`
    : "";
  console.log(`::${level}${location}::${escapeAnnotation(message)}`);
}

function reportConfigErrors(errors: ConfigError[], file: string): void {
  for (const error of errors) {
    const where = error.line
      ? `${relative(file)}:${error.line}`
      : relative(file);
    console.error(`  ${where}: ${error.message}`);
    annotate("error", error.message, file, error.line || undefined);
  }
}

function formatTargets(targets: string[]): string {
  const shown = targets.slice(0, 3).join(", ");
  return targets.length > 3 ? `${shown}, +${targets.length - 3} more` : shown;
}

function writeSummary(
  results: PageResult[],
  comparison: Comparison,
  passed: boolean,
): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [
    `## Accessibility scan (axe, WCAG 2.1 AA): ${passed ? "passed" : "failed"}`,
    "",
    "| Page | New serious/critical | Excepted | Minor/moderate (not checked) |",
    "| ---- | -------------------- | -------- | ---------------------------- |",
  ];
  for (const result of results) {
    if (result.loadError) {
      lines.push(
        `| \`${result.page}\` | did not load: ${result.loadError} | | |`,
      );
      continue;
    }
    const count = (list: Violation[]) =>
      list.filter((v) => v.page === result.page).length;
    const minor = result.violations.filter(
      (v) =>
        !comparison.failures.includes(v) && !comparison.excepted.includes(v),
    ).length;
    lines.push(
      `| \`${result.page}\` | ${count(comparison.failures)} | ${count(comparison.excepted)} | ${minor} |`,
    );
  }
  if (comparison.failures.length > 0) {
    lines.push("", "### New issues", "");
    for (const v of comparison.failures) {
      lines.push(
        `- \`${v.page}\` **${v.rule}** (${v.impact}): ${v.help} ([rule docs](${v.helpUrl}))  `,
        `  Elements: \`${formatTargets(v.targets)}\``,
      );
    }
    lines.push(
      "",
      "Fix these, or, if an issue can't be fixed in this pull request, add its line to `website/a11y/exceptions.txt`:",
      "",
      "```",
      ...[...new Set(comparison.failures.map(exceptionLine))],
      "```",
    );
  }
  if (comparison.stale.length > 0) {
    lines.push(
      "",
      "### Exceptions that no longer match",
      "",
      "These issues are gone. Remove the lines from `website/a11y/exceptions.txt`:",
      "",
      "```",
      ...comparison.stale.map((e) => `${e.page} ${e.rule}`),
      "```",
    );
  }
  fs.appendFileSync(file, lines.join("\n") + "\n");
}

async function main(): Promise<number> {
  const parsedPages = parsePages(
    fs.readFileSync(PAGES_FILE, "utf8"),
    relative(PAGES_FILE),
  );
  const parsedExceptions = parseExceptions(
    fs.readFileSync(EXCEPTIONS_FILE, "utf8"),
    parsedPages.pages,
    relative(EXCEPTIONS_FILE),
  );
  if (parsedPages.errors.length || parsedExceptions.errors.length) {
    console.error("Accessibility scan config is invalid:");
    reportConfigErrors(parsedPages.errors, PAGES_FILE);
    reportConfigErrors(parsedExceptions.errors, EXCEPTIONS_FILE);
    return 1;
  }
  if (!fs.existsSync(path.join(CLIENT_DIR, "index.html"))) {
    console.error(
      `No build found at ${relative(CLIENT_DIR)}. Run \`pnpm run build\` first.`,
    );
    return 1;
  }

  const server = await serveBuild(CLIENT_DIR);
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const browser = await chromium.launch();
  const results: PageResult[] = [];
  try {
    for (const page of parsedPages.pages) {
      results.push(await scanPage(browser, origin, page));
    }
  } finally {
    await browser.close();
    server.close();
  }

  const comparison = compareResults(
    results.flatMap((r) => r.violations),
    parsedExceptions.exceptions,
  );
  const loadFailures = results.filter((r) => r.loadError);

  console.log(
    `Scanned ${results.length} page(s) with axe against WCAG 2.1 AA ` +
      `(fails on serious and critical issues).\n`,
  );
  for (const result of results) {
    if (result.loadError) {
      console.log(`✗ ${result.page}: did not load (${result.loadError})`);
      annotate(
        "error",
        `${result.page} did not load: ${result.loadError}`,
        PAGES_FILE,
      );
      continue;
    }
    const failures = comparison.failures.filter((v) => v.page === result.page);
    const excepted = comparison.excepted.filter((v) => v.page === result.page);
    const mark = failures.length ? "✗" : "✓";
    console.log(
      `${mark} ${result.page}: ${failures.length} new, ${excepted.length} excepted`,
    );
    for (const v of failures) {
      console.log(`    ${v.rule} (${v.impact}): ${v.help}`);
      console.log(`      ${v.helpUrl}`);
      console.log(`      Elements: ${formatTargets(v.targets)}`);
      annotate(
        "error",
        `${v.page}: ${v.rule} (${v.impact}): ${v.help}. ${v.helpUrl}`,
      );
    }
  }

  if (comparison.stale.length > 0) {
    console.log(
      `\nThese exceptions no longer match an issue. Remove them from ${relative(EXCEPTIONS_FILE)}:`,
    );
    for (const e of comparison.stale) {
      console.log(`  ${e.page} ${e.rule}`);
      annotate(
        "warning",
        `Exception no longer needed: ${e.page} ${e.rule}`,
        EXCEPTIONS_FILE,
        e.line,
      );
    }
  }

  const passed = comparison.failures.length === 0 && loadFailures.length === 0;
  if (comparison.failures.length > 0) {
    console.log(
      `\nFix the issues above. If one can't be fixed in this pull request, ` +
        `add its line to ${relative(EXCEPTIONS_FILE)}:`,
    );
    for (const line of new Set(comparison.failures.map(exceptionLine))) {
      console.log(`  ${line}`);
    }
  }
  writeSummary(results, comparison, passed);
  console.log(
    passed ? "\nAccessibility scan passed." : "\nAccessibility scan failed.",
  );
  return passed ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
