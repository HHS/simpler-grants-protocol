/**
 * The request matrix behind the byte-identity guarantee (#1078-T1).
 *
 * One list, two consumers: `capture-golden.ts` replays it against the 3A
 * standalone Worker to produce `golden-envelopes.json`, and
 * `golden-envelopes.spec.ts` replays it against this site's Astro endpoint and
 * asserts the responses match byte for byte. Adding a case here means
 * re-running the capture script — a case with no golden entry fails the spec
 * rather than being skipped.
 *
 * `path` is written **relative to the mock's base path**, so the same entry
 * addresses `https://<worker>.workers.dev/v0.4.0/...` on the Worker and
 * `https://<site>/api/v0.4.0/...` here. That difference in base is the only
 * thing the two hosts are allowed to disagree about; see `pathEchoing`.
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
  /**
   * Sent verbatim as the request body — a string, so malformed-JSON cases can
   * be expressed. `undefined` means no body.
   */
  body?: string;
  /**
   * True when the response body quotes the request path back to the caller
   * (the router's route-miss 404s do). Those bodies necessarily differ between
   * the two hosts by the `/api` base prefix, so the spec re-inserts the base
   * into the golden text before comparing instead of demanding raw equality.
   * Every other case is compared byte for byte with no normalization at all.
   */
  pathEchoing?: boolean;
}

/** `/v{version}/common-grants/opportunities` + optional suffix. */
function opportunities(version: string, suffix = ""): string {
  return `/v${version}/common-grants/opportunities${suffix}`;
}

/**
 * Exercises filters, sorting, and pagination in one body so the search
 * envelope's `filterInfo` / `sortInfo` / `paginationInfo` are all pinned.
 */
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

/** The three endpoints across all four versions — the AC's 3 × 4 core. */
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

/**
 * The #1077-T3 edge cases, pinned on 0.3.0 (shaping is identical on 0.4.0 and
 * the error envelopes don't vary by version at all).
 */
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
  // `GET .../search` deliberately falls through to the detail handler, which
  // answers 400 "Must be a valid UUID" — the Worker's documented behavior.
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
  // `sortBy: "custom"` is a valid wire value with no built-in ordering: the
  // items come back unsorted and `sortInfo.errors` carries a non-fatal note.
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
  // Fixture money is USD throughout, so an EUR bound matches nothing and the
  // envelope must report `totalPages: 0` rather than 1.
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
  //
  // There used to be a second case here, `route-miss-other-resource`, requesting
  // `GET /v0.4.0/common-grants/awards` and expecting the Worker's
  // "This mock serves the opportunity endpoints only" 404. #3C-2-T1 removed it,
  // because awards are now served and that path answers 200 with an award list.
  //
  // It was not replaced with a different unserved path, and that is the honest
  // call rather than a gap: the Worker's route-miss message *named its own
  // surface*, so once the two hosts serve different surfaces, no unserved path
  // produces the same bytes on both. Byte-identity on route-miss wording is not
  // recoverable, so it is retired here and the behavior is pinned structurally
  // in `router.spec.ts` instead ("flags a path outside the served surface with
  // field: 'path'" and its version-gating sibling).
  //
  // The case below survives because it is a route miss *on the shared surface*:
  // `PUT /opportunities` matches no route on either host, and both answer the same
  // "No route matches" body, so it is still a real byte-level comparison.
  {
    name: "route-miss-unsupported-method",
    method: "PUT",
    path: opportunities("0.4.0"),
    pathEchoing: true,
  },
];

export const REQUEST_MATRIX: MatrixCase[] = [...versionedCases, ...edgeCases];
