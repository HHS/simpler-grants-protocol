/**
 * Deterministic, fixture-backed handlers for the CommonGrants award list,
 * detail, and search endpoints (#334).
 *
 * The opportunity handler is the template this follows, and the differences are
 * only the ones the spec forces:
 *  - `Models.AwdSortBy` and `Models.AwdFilters` replace their `Opp*`
 *    counterparts, so the legal sort fields and filter names differ.
 *  - `opportunityId` is a `StringArrayFilter` over a *reference* field
 *    (`opportunity.id`) rather than over a value on the record itself — the one
 *    filter in the mock that reads across a resource boundary.
 *  - There is no version shaping. Awards are `@added(Versions.v0_4)` whole, so
 *    the router 404s earlier versions and every request that reaches here is
 *    v0.4. `version` is still taken as a parameter so all handlers share one
 *    signature and the router does not special-case awards.
 *
 * Everything else — pagination defaults and validation, the total-order sort,
 * `between`/`outside` range semantics, the `filterInfo.errors` channel for
 * filters the mock can't apply — comes from `http/query.ts`, shared with every
 * other resource so the protocol's rules are decided once.
 */

import { allAwards, getAwardById, type Award } from "../data/awards";
import type { Version } from "../data/fixtures";
import {
  errorResponse,
  successResponse,
  type FieldError,
} from "../http/envelope";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  VALID_RANGE_OPERATORS,
  applyDateRangeFilter,
  applyMoneyRangeFilter,
  applyStringArrayFilter,
  dateTime,
  isMoney,
  isUuid,
  moneyAmount,
  orderBy,
  pageOf,
  paginationInfo,
  readJsonObjectBody,
  resolvePagination,
  resolveQueryPagination,
  validateArrayFilters,
  validateSorting,
  type DateRangeFilter,
  type Money,
  type MoneyRangeFilter,
  type StringArrayFilter,
} from "../http/query";

/** Wire values of `Models.AwdSortBy` (`lib/core/lib/core/models/award.tsp`). */
const VALID_SORT_BY = new Set([
  "lastModifiedAt",
  "createdAt",
  "title",
  "status.value",
  "keyDates.awardDate",
  "funding.awardedAmount",
  "custom",
]);

/** The string-array filter fields of `Models.AwdDefaultFilters`. */
const ARRAY_FILTER_FIELDS = ["status", "opportunityId"] as const;

/** Filters accepted on `POST /awards/search` (`Models.AwdFilters`). */
interface AwdFilters {
  status?: StringArrayFilter;
  opportunityId?: StringArrayFilter;
  awardDateRange?: DateRangeFilter;
  awardedAmountRange?: MoneyRangeFilter;
  customFilters?: Record<string, unknown>;
}

interface AwdSorting {
  sortBy: string;
  customSortBy?: string;
  sortOrder?: string;
}

interface SearchRequestBody {
  search?: string;
  filters?: AwdFilters;
  sorting?: AwdSorting;
  pagination?: { page?: number; pageSize?: number };
}

/** Extracts the field an `AwdSortBy` wire value sorts on. */
function sortKey(award: Award, sortBy: string): string | number {
  switch (sortBy) {
    case "lastModifiedAt":
      return new Date(award.lastModifiedAt).getTime();
    case "createdAt":
      return new Date(award.createdAt).getTime();
    case "title":
      return award.title;
    case "status.value":
      return award.status.value;
    case "keyDates.awardDate":
      return dateTime(award.keyDates?.awardDate?.date) ?? 0;
    case "funding.awardedAmount":
      return moneyAmount(award.funding?.awardedAmount) ?? 0;
    default:
      // "custom" (application-defined field) - no built-in ordering to apply.
      return 0;
  }
}

/** The value an array filter matches against, per filter field name. */
function arrayFilterValue(
  award: Award,
  field: (typeof ARRAY_FILTER_FIELDS)[number],
): string {
  // `opportunityId` filters on the *referenced* opportunity. An award with no
  // opportunity reference has no id to match, so it falls out of an `in` filter
  // and stays in a `notIn` one — the same treatment an absent scalar gets.
  return field === "status"
    ? award.status.value
    : (award.opportunity?.id ?? "");
}

/** The `Money` field a money-range filter reads, per filter field name. */
function moneyFilterValue(award: Award): Money | undefined {
  return award.funding?.awardedAmount;
}

/**
 * `GET /v{version}/common-grants/awards` — the paginated list, ordered
 * newest-modified first.
 *
 * @param request - Carries the `page`/`pageSize` query params.
 * @param version - Protocol version; awards exist only in v0.4, so this is
 * always `"0.4.0"` by the time the router dispatches here.
 */
export function listAwards(request: Request, version: Version): Response {
  void version;
  const pagination = resolveQueryPagination(request);
  if (!pagination.ok) {
    return errorResponse(
      400,
      "Invalid pagination parameters",
      pagination.errors,
    );
  }
  const { page, pageSize } = pagination;

  const sorted = orderBy(
    allAwards(),
    (award) => sortKey(award, "lastModifiedAt"),
    "desc",
  );

  return successResponse({
    items: pageOf(sorted, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, sorted.length),
  });
}

/**
 * `GET /v{version}/common-grants/awards/{awdId}` — a single record.
 *
 * @param awdId - The path segment as received; validated as UUID-shaped here
 * rather than in the router, so a malformed id answers 400 (not a route miss).
 * @param version - Protocol version; always v0.4 here (see `listAwards`).
 */
export function getAward(awdId: string, version: Version): Response {
  void version;
  if (!isUuid(awdId)) {
    return errorResponse(400, "Invalid award id", [
      { field: "awdId", message: "Must be a valid UUID" },
    ]);
  }

  const award = getAwardById(awdId);
  if (!award) {
    return errorResponse(404, "Award not found", [
      { field: "awdId", message: `No award found with id ${awdId}` },
    ]);
  }

  return successResponse({ data: award });
}

/**
 * `POST /v{version}/common-grants/awards/search` — filtered, sorted, paginated
 * search over the same fixture set.
 *
 * @param request - Carries the `AwdSearchRequest` JSON body.
 * @param version - Protocol version; always v0.4 here (see `listAwards`).
 */
export async function searchAwards(
  request: Request,
  version: Version,
): Promise<Response> {
  void version;
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.body as SearchRequestBody;

  const errors: FieldError[] = [];
  const filters = body.filters ?? {};
  const sorting = body.sorting;

  validateSorting(sorting, VALID_SORT_BY, errors);

  validateArrayFilters(ARRAY_FILTER_FIELDS, filters, errors);

  for (const field of ["awardDateRange", "awardedAmountRange"] as const) {
    const filter = filters[field];
    if (!filter) continue;
    if (!VALID_RANGE_OPERATORS.has(filter.operator)) {
      errors.push({
        field: `filters.${field}.operator`,
        message: `Unknown range operator: ${String(filter.operator)}`,
      });
      continue;
    }
    if (
      !filter.value ||
      typeof filter.value !== "object" ||
      (filter.value.min === undefined && filter.value.max === undefined)
    ) {
      errors.push({
        field: `filters.${field}.value`,
        message: "Must include at least one of min or max",
      });
      continue;
    }
    // Validate the bounds themselves, not just their presence — a malformed
    // bound silently dropped would return a result set that contradicts the
    // filter the caller asked for.
    const isDateRange = field === "awardDateRange";
    for (const bound of ["min", "max"] as const) {
      const value = filter.value[bound];
      if (value === undefined) continue;
      if (isDateRange ? dateTime(value) === undefined : !isMoney(value)) {
        errors.push({
          field: `filters.${field}.value.${bound}`,
          message: isDateRange
            ? `Must be a valid ISO 8601 date, received: ${JSON.stringify(value)}`
            : `Must be a Money object with a numeric amount and a currency, received: ${JSON.stringify(value)}`,
        });
      }
    }
  }

  const pagination = resolvePagination(
    body.pagination?.page,
    body.pagination?.pageSize,
    "pagination.",
  );
  if (!pagination.ok) {
    errors.push(...pagination.errors);
  }
  // The defaults here are unreachable: an invalid pagination pair pushed errors
  // above, and the guard below returns before they are used.
  const { page, pageSize } = pagination.ok
    ? pagination
    : { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };

  if (errors.length > 0) {
    return errorResponse(400, "Invalid search request", errors);
  }

  let items = allAwards();

  if (body.search) {
    const q = body.search.toLowerCase();
    items = items.filter(
      (award) =>
        award.title.toLowerCase().includes(q) ||
        award.description.toLowerCase().includes(q),
    );
  }
  for (const field of ARRAY_FILTER_FIELDS) {
    const filter = filters[field];
    if (!filter) continue;
    items = applyStringArrayFilter(items, filter, (award) =>
      arrayFilterValue(award, field),
    );
  }
  if (filters.awardDateRange) {
    items = applyDateRangeFilter(items, filters.awardDateRange, (award) =>
      dateTime(award.keyDates?.awardDate?.date),
    );
  }
  if (filters.awardedAmountRange) {
    items = applyMoneyRangeFilter(
      items,
      filters.awardedAmountRange,
      moneyFilterValue,
    );
  }

  const sortBy = sorting?.sortBy ?? "lastModifiedAt";
  const sortOrder = sorting?.sortOrder ?? "desc";
  const sortErrors: string[] = [];
  if (sortBy === "custom") {
    sortErrors.push(
      sorting?.customSortBy
        ? `Custom sort field "${sorting.customSortBy}" is not supported by this mock; results are unsorted for it.`
        : "Custom sort requested without customSortBy; results are unsorted.",
    );
  } else {
    items = orderBy(items, (award) => sortKey(award, sortBy), sortOrder);
  }

  // `filterInfo.errors` is the spec's channel for "non-fatal errors that
  // occurred during filtering". `customFilters` are implementation-defined, so
  // this mock echoes them but can't apply them — say so rather than letting the
  // echo imply they narrowed the results.
  const filterErrors: string[] = [];
  const customFilterNames = Object.keys(filters.customFilters ?? {});
  if (customFilterNames.length > 0) {
    filterErrors.push(
      `Custom filters are not supported by this mock and were not applied: ${customFilterNames.join(", ")}.`,
    );
  }

  return successResponse({
    items: pageOf(items, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, items.length),
    sortInfo: {
      sortBy,
      ...(sorting?.customSortBy !== undefined
        ? { customSortBy: sorting.customSortBy }
        : {}),
      sortOrder,
      ...(sortErrors.length > 0 ? { errors: sortErrors } : {}),
    },
    filterInfo: {
      filters,
      ...(filterErrors.length > 0 ? { errors: filterErrors } : {}),
    },
  });
}
