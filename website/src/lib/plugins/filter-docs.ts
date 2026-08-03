import type { CustomFilterType } from "./types";

/** Filter docs index, used when a filter type has no model of its own. */
const FILTERS_OVERVIEW = "/protocol/filters/";

/**
 * Maps each filter type to the protocol model that defines it.
 *
 * `booleanComparison` points at the overview because the protocol has no
 * boolean filter model: custom filter values are typed `unknown`
 * (Filters.DefaultFilter) and no base field is boolean, so the type exists only
 * in the SDKs. None of the filter docs pages emit a boolean anchor, so there is
 * nothing more specific to link to — don't invent one.
 */
const DOCS_HREF: Record<CustomFilterType, string> = {
  stringComparison: "/protocol/filters/string#stringcomparisonfilter",
  stringArray: "/protocol/filters/string#stringarrayfilter",
  numberComparison: "/protocol/filters/numeric#numbercomparisonfilter",
  numberArray: "/protocol/filters/numeric#numberarrayfilter",
  numberRange: "/protocol/filters/numeric#numberrangefilter",
  booleanComparison: FILTERS_OVERVIEW,
  dateComparison: "/protocol/filters/date#datecomparisonfilter",
  dateRange: "/protocol/filters/date#daterangefilter",
  moneyComparison: "/protocol/filters/money#moneycomparisonfilter",
  moneyRange: "/protocol/filters/money#moneyrangefilter",
};

/**
 * Narrows a filterType read from index.json, which is untyped JSON.
 *
 * Own-property check, not `in`: `in` walks the prototype chain, so a typo'd
 * "constructor" or "toString" would pass and filterDocsHref would return a
 * function as the href.
 */
export function isCustomFilterType(value: string): value is CustomFilterType {
  return Object.hasOwn(DOCS_HREF, value);
}

/** Returns the docs link for a filter type. */
export function filterDocsHref(filterType: CustomFilterType): string {
  return DOCS_HREF[filterType];
}
