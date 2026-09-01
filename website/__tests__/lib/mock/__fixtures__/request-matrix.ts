/**
 * One request matrix, two consumers (#1078): `capture-golden.ts` replays it
 * against the 3A Worker to produce `golden-envelopes.json`, and
 * `golden-envelopes.spec.ts` replays it against this site's endpoint. Adding
 * a case means re-running the capture script. `path` is relative to the
 * mock's base path, so the same entry works on both hosts.
 */

import {
  CANONICAL_OPPORTUNITY_ID,
  RESERVED_MISSING_OPPORTUNITY_ID,
  SUPPORTED_VERSIONS,
} from "@/lib/mock/data/fixtures";

export interface MatrixCase {
  /** Stable key into `golden-envelopes.json`. Renaming one orphans its entry. */
  name: string;
  method: string;
  /** Path below the base, always starting with `/v{version}`. */
  path: string;
  /** Sent verbatim as a string, so malformed-JSON cases can be expressed. */
  body?: string;
  /**
   * True when the response body quotes the request path back (route-miss 404s
   * do). The spec re-inserts the `/api` base into the golden text for those.
   */
  pathEchoing?: boolean;
}

/** `/v{version}/common-grants/opportunities` + optional suffix. */
function opportunities(version: string, suffix = ""): string {
  return `/v${version}/common-grants/opportunities${suffix}`;
}

/** Exercises filters, sorting, and pagination in one body. */
const REPRESENTATIVE_SEARCH = JSON.stringify({
  filters: {
    status: { operator: "in", value: ["open", "forecasted"] },
    totalFundingAvailableRange: {
      operator: "between",
      value: {
        min: { amount: "0", currency: "USD" },
        max: { amount: "10000000", currency: "USD" },
      },
    },
  },
  sorting: { sortBy: "keyDates.closeDate", sortOrder: "asc" },
  pagination: { page: 1, pageSize: 5 },
});

/** The three endpoints across all four versions. */
const versionedCases: MatrixCase[] = SUPPORTED_VERSIONS.flatMap((version) => [
  { name: `list-v${version}`, method: "GET", path: opportunities(version) },
  {
    name: `detail-canonical-v${version}`,
    method: "GET",
    path: opportunities(version, `/${CANONICAL_OPPORTUNITY_ID}`),
  },
  {
    name: `search-v${version}`,
    method: "POST",
    path: opportunities(version, "/search"),
    body: REPRESENTATIVE_SEARCH,
  },
]);

/** Edge cases, pinned on 0.3.0 — they don't vary by version. */
const edgeCases: MatrixCase[] = [
  // --- list: pagination ---
  {
    name: "list-second-page",
    method: "GET",
    path: opportunities("0.3.0", "?page=2&pageSize=3"),
  },
  {
    name: "list-page-out-of-range",
    method: "GET",
    path: opportunities("0.3.0", "?page=99&pageSize=5"),
  },
  {
    name: "list-page-below-minimum",
    method: "GET",
    path: opportunities("0.3.0", "?page=0"),
  },
  {
    name: "list-page-size-non-integer",
    method: "GET",
    path: opportunities("0.3.0", "?pageSize=2.5"),
  },

  // --- detail ---
  {
    name: "detail-non-uuid",
    method: "GET",
    path: opportunities("0.3.0", "/not-a-uuid"),
  },
  {
    name: "detail-unknown-id",
    method: "GET",
    path: opportunities("0.3.0", `/${RESERVED_MISSING_OPPORTUNITY_ID}`),
  },
  // GET on /search falls through to the detail handler, matching the Worker.
  {
    name: "detail-get-search-falls-through",
    method: "GET",
    path: opportunities("0.3.0", "/search"),
  },

  // --- search ---
  {
    name: "search-malformed-json",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: "{not json",
  },
  {
    name: "search-non-object-body",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: "42",
  },
  {
    name: "search-empty-body",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: "{}",
  },
  // "custom" is a valid sortBy with no built-in ordering: items come back
  // unsorted and `sortInfo.errors` carries a non-fatal note.
  {
    name: "search-sort-by-custom",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: JSON.stringify({ sorting: { sortBy: "custom", sortOrder: "asc" } }),
  },
  {
    name: "search-unknown-sort-field",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: JSON.stringify({ sorting: { sortBy: "nope" } }),
  },
  // Fixture money is all USD, so an EUR bound matches nothing and the
  // envelope must report `totalPages: 0`.
  {
    name: "search-money-currency-mismatch",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: JSON.stringify({
      filters: {
        totalFundingAvailableRange: {
          operator: "between",
          value: {
            min: { amount: "0", currency: "EUR" },
            max: { amount: "99999999", currency: "EUR" },
          },
        },
      },
    }),
  },
  {
    name: "search-invalid-pagination",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: JSON.stringify({ pagination: { page: 0, pageSize: 10 } }),
  },
  {
    name: "search-invalid-filter-operator",
    method: "POST",
    path: opportunities("0.3.0", "/search"),
    body: JSON.stringify({
      filters: { status: { operator: "maybe", value: ["open"] } },
    }),
  },

  // --- version routing ---
  {
    name: "version-unsupported",
    method: "GET",
    path: opportunities("9.9.9"),
  },
  {
    name: "version-malformed",
    method: "GET",
    path: "/vabc/common-grants/opportunities",
  },

  // --- route misses (these quote the request path back; see `pathEchoing`) ---
  {
    name: "route-miss-other-resource",
    method: "GET",
    path: "/v0.4.0/common-grants/awards",
    pathEchoing: true,
  },
  {
    name: "route-miss-unsupported-method",
    method: "PUT",
    path: opportunities("0.4.0"),
    pathEchoing: true,
  },
];

export const REQUEST_MATRIX: MatrixCase[] = [...versionedCases, ...edgeCases];
