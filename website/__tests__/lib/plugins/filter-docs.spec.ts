import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { filterDocsHref, isCustomFilterType } from "@/lib/plugins/filter-docs";
import { Paths } from "@/lib/schema/paths";
import type { CustomFilterType } from "@/lib/plugins/types";

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

  // starlight-links-validator parses markdown, so it never sees links emitted
  // from the .astro plugin pages — confirmed by building with a deliberately
  // dead anchor and watching it report all links valid. Nothing else catches a
  // renamed heading silently breaking every filter card's deep link.
  it("anchors a heading that exists on the page it links to", () => {
    for (const filterType of ALL_FILTER_TYPES) {
      const href = filterDocsHref(filterType);
      const [page, anchor] = href.replace("/protocol/filters/", "").split("#");
      if (!anchor) continue;
      const mdx = fs.readFileSync(
        path.join(Paths.PROTOCOL_DOCS_DIR, "filters", `${page}.mdx`),
        "utf-8",
      );
      // Every filter model heading is one word, so its id is just the heading
      // lowercased. Splitting one into words breaks the anchor and fails here.
      const ids = [...mdx.matchAll(/^#{2,}\s+(\S+)\s*$/gm)].map((m) =>
        m[1].toLowerCase(),
      );
      expect(ids, `${filterType} -> ${href}`).toContain(anchor);
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

  // An `in` check would accept these off the prototype chain, and
  // filterDocsHref would hand back a function to render as an href.
  it("rejects inherited Object properties", () => {
    expect(isCustomFilterType("constructor")).toBe(false);
    expect(isCustomFilterType("toString")).toBe(false);
  });
});
