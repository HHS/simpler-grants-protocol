import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  compareResults,
  exceptionLine,
  isBlocking,
  parseExceptions,
  parsePages,
  type Violation,
} from "@/lib/a11y/config";

const A11Y_DIR = path.resolve(__dirname, "..", "..", "..", "a11y");

function violation(overrides: Partial<Violation> = {}): Violation {
  return {
    page: "/",
    rule: "image-alt",
    impact: "critical",
    help: "Images must have alternative text",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.14/image-alt",
    targets: ["img"],
    ...overrides,
  };
}

describe("parsePages", () => {
  it("reads one path per line, skipping blanks and comments", () => {
    const { pages, errors } = parsePages(
      "# header\n/\n\n/forms/   # trailing comment\n  /plugins/  \n",
    );
    expect(errors).toEqual([]);
    expect(pages).toEqual(["/", "/forms/", "/plugins/"]);
  });

  it("handles Windows line endings", () => {
    expect(parsePages("/\r\n/forms/\r\n").pages).toEqual(["/", "/forms/"]);
  });

  it("rejects relative paths, queries, extra fields, and duplicates", () => {
    const { pages, errors } = parsePages("forms/\n/a/?b=1\n/x/ /y/\n/\n/\n");
    expect(pages).toEqual(["/"]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 5]);
    expect(errors[3].message).toContain("duplicate");
  });

  it("requires a trailing slash, as the site serves its pages", () => {
    const { pages, errors } = parsePages("/forms\n/forms/sf424\n/forms/\n");
    expect(pages).toEqual(["/forms/"]);
    expect(errors.map((e) => e.line)).toEqual([1, 2]);
    expect(errors[0].message).toBe('page must end with "/": /forms');
  });

  it("rejects an empty list", () => {
    const { errors } = parsePages("# nothing here\n");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("no pages to scan");
  });
});

describe("parseExceptions", () => {
  const pages = ["/", "/forms/"];

  it("reads one page and rule per line", () => {
    const { exceptions, errors } = parseExceptions(
      "# known issues\n/ color-contrast\n\n/forms/ select-name # Swagger\n",
      pages,
    );
    expect(errors).toEqual([]);
    expect(exceptions).toEqual([
      { page: "/", rule: "color-contrast", line: 2 },
      { page: "/forms/", rule: "select-name", line: 4 },
    ]);
  });

  it("rejects an exception page without a trailing slash", () => {
    const { exceptions, errors } = parseExceptions("/forms color-contrast", [
      "/forms/",
    ]);
    expect(exceptions).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('page must end with "/": /forms');
  });

  it("rejects malformed lines, pages not in the scan, and duplicates", () => {
    const { exceptions, errors } = parseExceptions(
      [
        "/ color-contrast",
        "color-contrast",
        "/ color-contrast extra",
        "/plugins/ color-contrast",
        "forms/ color-contrast",
        "/ color-contrast",
      ].join("\n"),
      pages,
    );
    expect(exceptions).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6]);
    expect(errors[2].message).toContain("not in the scan list");
    expect(errors[4].message).toContain("duplicate");
  });
});

describe("isBlocking", () => {
  it("fails only on axe's serious and critical impacts", () => {
    expect(isBlocking("critical")).toBe(true);
    expect(isBlocking("serious")).toBe(true);
    expect(isBlocking("moderate")).toBe(false);
    expect(isBlocking("minor")).toBe(false);
    expect(isBlocking(null)).toBe(false);
    expect(isBlocking(undefined)).toBe(false);
  });
});

describe("compareResults", () => {
  it("fails on a serious or critical issue with no exception", () => {
    const issue = violation();
    const result = compareResults([issue], []);
    expect(result.failures).toEqual([issue]);
    expect(result.excepted).toEqual([]);
    expect(result.stale).toEqual([]);
  });

  it("ignores moderate and minor issues", () => {
    const result = compareResults(
      [violation({ impact: "moderate" }), violation({ impact: "minor" })],
      [],
    );
    expect(result.failures).toEqual([]);
    expect(result.excepted).toEqual([]);
  });

  it("excepts an issue only on the listed page", () => {
    const home = violation({ page: "/" });
    const forms = violation({ page: "/forms/" });
    const result = compareResults(
      [home, forms],
      [{ page: "/", rule: "image-alt", line: 1 }],
    );
    expect(result.excepted).toEqual([home]);
    expect(result.failures).toEqual([forms]);
  });

  it("excepts an issue only for the listed rule", () => {
    const contrast = violation({ rule: "color-contrast", impact: "serious" });
    const result = compareResults(
      [contrast, violation()],
      [{ page: "/", rule: "color-contrast", line: 1 }],
    );
    expect(result.excepted).toEqual([contrast]);
    expect(result.failures.map((v) => v.rule)).toEqual(["image-alt"]);
  });

  it("reports exceptions that matched nothing as stale", () => {
    const stale = { page: "/forms/", rule: "color-contrast", line: 3 };
    const result = compareResults(
      [violation()],
      [{ page: "/", rule: "image-alt", line: 1 }, stale],
    );
    expect(result.stale).toEqual([stale]);
  });

  it("treats an exception matched only by a moderate issue as stale", () => {
    const exception = { page: "/", rule: "image-alt", line: 1 };
    const result = compareResults(
      [violation({ impact: "moderate" })],
      [exception],
    );
    expect(result.stale).toEqual([exception]);
  });
});

describe("exceptionLine", () => {
  it("formats a violation as a line for the exceptions file", () => {
    const line = exceptionLine(violation({ page: "/forms/" }));
    expect(line).toBe("/forms/ image-alt");
    expect(parseExceptions(line, ["/forms/"]).errors).toEqual([]);
  });
});

describe("committed config", () => {
  const pagesFile = fs.readFileSync(path.join(A11Y_DIR, "pages.txt"), "utf8");
  const exceptionsFile = fs.readFileSync(
    path.join(A11Y_DIR, "exceptions.txt"),
    "utf8",
  );

  it("has a valid page list that includes the required pages", () => {
    const { pages, errors } = parsePages(pagesFile);
    expect(errors).toEqual([]);
    expect(pages).toEqual(
      expect.arrayContaining([
        "/",
        "/protocol/api-docs/",
        "/custom-fields/",
        "/forms/",
        "/question-bank/",
        "/plugins/",
        "/registries/",
      ]),
    );
  });

  it("has a valid exceptions file", () => {
    const { pages } = parsePages(pagesFile);
    expect(parseExceptions(exceptionsFile, pages).errors).toEqual([]);
  });
});
