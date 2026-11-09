/**
 * Config parsing and result comparison for the accessibility scan
 * (`src/scripts/a11y-scan.ts`). Kept free of Playwright and file I/O so it
 * can be unit tested without a browser or a build.
 *
 * Both config files are plain text, one entry per line. Blank lines and
 * anything after a `#` are ignored.
 *
 * - `a11y/pages.txt`: one site path per line, e.g. `/forms/`.
 * - `a11y/exceptions.txt`: one `<page> <rule-id>` pair per line, e.g.
 *   `/forms/ color-contrast`, for a known issue the scan should not fail on.
 */

/** The axe impact levels that fail the check. */
export const BLOCKING_IMPACTS = ["serious", "critical"] as const;

/** The axe tags for WCAG 2.1 level A and AA (2.1 AA includes 2.0 A and AA). */
export const WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface ConfigError {
  file: string;
  line: number;
  message: string;
}

export interface ParsedPages {
  pages: string[];
  errors: ConfigError[];
}

export interface Exception {
  page: string;
  rule: string;
  /** 1-based line number in the exceptions file, for error messages. */
  line: number;
}

export interface ParsedExceptions {
  exceptions: Exception[];
  errors: ConfigError[];
}

/** One axe violation on one page, reduced to what the check needs. */
export interface Violation {
  page: string;
  rule: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  /** CSS selectors of the offending elements, as reported by axe. */
  targets: string[];
}

export interface Comparison {
  /** Serious or critical violations that no exception covers. These fail. */
  failures: Violation[];
  /** Serious or critical violations covered by an exception. */
  excepted: Violation[];
  /** Exceptions that matched nothing in this scan, so they can be removed. */
  stale: Exception[];
}

/** Strips a trailing `# comment` and surrounding whitespace. */
function stripComment(raw: string): string {
  const hash = raw.indexOf("#");
  return (hash === -1 ? raw : raw.slice(0, hash)).trim();
}

/**
 * A page path must be site-relative and end in a slash: `/`, `/forms/`,
 * `/forms/sf424/`. The site serves its pages with trailing slashes, and the
 * local server would answer `/forms` with a 200 where production redirects,
 * so a path without the slash is rejected rather than scanned by accident.
 */
function pathError(page: string): string | null {
  if (!page.startsWith("/")) return `page must start with "/": ${page}`;
  if (/[?#\s]/.test(page))
    return `page must be a plain path, without a query or fragment: ${page}`;
  if (!page.endsWith("/")) return `page must end with "/": ${page}`;
  return null;
}

/** Parses `a11y/pages.txt`. Duplicate pages are errors, not silently merged. */
export function parsePages(content: string, file = "pages.txt"): ParsedPages {
  const pages: string[] = [];
  const errors: ConfigError[] = [];
  content.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const entry = stripComment(raw);
    if (!entry) return;
    const fields = entry.split(/\s+/);
    if (fields.length !== 1) {
      errors.push({ file, line, message: `expected one path, got: ${entry}` });
      return;
    }
    const problem = pathError(entry);
    if (problem) {
      errors.push({ file, line, message: problem });
    } else if (pages.includes(entry)) {
      errors.push({ file, line, message: `duplicate page: ${entry}` });
    } else {
      pages.push(entry);
    }
  });
  if (pages.length === 0 && errors.length === 0) {
    errors.push({ file, line: 0, message: "no pages to scan" });
  }
  return { pages, errors };
}

/**
 * Parses `a11y/exceptions.txt`. Each line is `<page> <rule-id>`. Exceptions
 * for pages that are not in the scan are errors, so a typo in either file
 * can't quietly hide an issue.
 */
export function parseExceptions(
  content: string,
  scannedPages: string[],
  file = "exceptions.txt",
): ParsedExceptions {
  const exceptions: Exception[] = [];
  const errors: ConfigError[] = [];
  const seen = new Set<string>();
  content.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const entry = stripComment(raw);
    if (!entry) return;
    const fields = entry.split(/\s+/);
    if (fields.length !== 2) {
      errors.push({
        file,
        line,
        message: `expected "<page> <rule-id>", got: ${entry}`,
      });
      return;
    }
    const [page, rule] = fields;
    const problem = pathError(page);
    if (problem) {
      errors.push({ file, line, message: problem });
      return;
    }
    if (!scannedPages.includes(page)) {
      errors.push({
        file,
        line,
        message: `page is not in the scan list: ${page}`,
      });
      return;
    }
    const key = `${page} ${rule}`;
    if (seen.has(key)) {
      errors.push({ file, line, message: `duplicate exception: ${key}` });
      return;
    }
    seen.add(key);
    exceptions.push({ page, rule, line });
  });
  return { exceptions, errors };
}

export function isBlocking(impact: string | null | undefined): boolean {
  return (BLOCKING_IMPACTS as readonly string[]).includes(impact ?? "");
}

/**
 * Splits the scan's violations into failures and excepted issues, and finds
 * exceptions that no longer match anything. Violations below "serious" are
 * ignored. An exception matches on page and rule, regardless of how many
 * elements on that page break the rule.
 */
export function compareResults(
  violations: Violation[],
  exceptions: Exception[],
): Comparison {
  const keyOf = (page: string, rule: string) => `${page} ${rule}`;
  const exceptionKeys = new Set(exceptions.map((e) => keyOf(e.page, e.rule)));
  const matched = new Set<string>();
  const failures: Violation[] = [];
  const excepted: Violation[] = [];

  for (const violation of violations) {
    if (!isBlocking(violation.impact)) continue;
    const key = keyOf(violation.page, violation.rule);
    if (exceptionKeys.has(key)) {
      matched.add(key);
      excepted.push(violation);
    } else {
      failures.push(violation);
    }
  }

  const stale = exceptions.filter((e) => !matched.has(keyOf(e.page, e.rule)));
  return { failures, excepted, stale };
}

/** The line to paste into the exceptions file to accept a violation. */
export function exceptionLine(violation: Violation): string {
  return `${violation.page} ${violation.rule}`;
}
