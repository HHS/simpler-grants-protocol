import { describe, it, expect } from "vitest";
import { filterDocsHref, isCustomFilterType } from "@/lib/plugins/filter-docs";
import type { CustomFilterType } from "@/lib/plugins/types";

/**
 * Pages that exist under src/content/docs/protocol/filters/. A filter type may
 * only link to one of these, or to the index.
 */
const FILTER_DOC_PAGES = ["string", "numeric", "date", "money"];

const ALL_FILTER_TYPES: CustomFilterType[] = [
  "stringComparison",
  "stringArray",
  "numberComparison",
  "numberArray",
  "numberRange",
  "booleanComparison",
  "dateComparison",
  "dateRange",
  "moneyComparison",
  "moneyRange",
];

describe("filterDocsHref", () => {
  // The protocol has no boolean filter model, so no boolean anchor is ever
  // emitted. Catches "completing" the map by pattern with a made-up anchor.
  it("sends booleanComparison to the filters index, not an anchor", () => {
    expect(filterDocsHref("booleanComparison")).toBe("/protocol/filters/");
  });

  // Catches a typo'd page segment (e.g. /filters/numbers#...), which no type
  // check sees because every href is just a string.
  it("only links to filter docs pages that exist", () => {
    for (const filterType of ALL_FILTER_TYPES) {
      const href = filterDocsHref(filterType);
      if (href === "/protocol/filters/") continue;
      const page = href.replace("/protocol/filters/", "").split("#")[0];
      expect(FILTER_DOC_PAGES).toContain(page);
    }
  });
});

describe("isCustomFilterType", () => {
  // The guard is what stops a bad index.json edit from reaching the page, so a
  // regression here renders filters the SDK would reject.
  it("accepts every known filter type", () => {
    for (const filterType of ALL_FILTER_TYPES) {
      expect(isCustomFilterType(filterType)).toBe(true);
    }
  });

  it("rejects terse and misspelled filter types", () => {
    expect(isCustomFilterType("string")).toBe(false);
    expect(isCustomFilterType("boolean")).toBe(false);
    expect(isCustomFilterType("stringArrays")).toBe(false);
    expect(isCustomFilterType("")).toBe(false);
  });
});
