/**
 * Deterministic, fixture-backed handlers for the CommonGrants opportunity list,
 * detail, and search endpoints (#1077).
 *
 * Ported from the MSW mock-playground spike (#1049, branch
 * `karina/playground-spike`, `website/src/lib/mock/opportunities/handlers.ts`).
 * MSW touched this module in exactly two places, both removed here:
 *  - `http.get/post(PATH, resolver)` registration → the three exported
 *    `(Request, Version) => Response` functions below, dispatched by the router
 *    in `src/index.ts`.
 *  - `HttpResponse.json` → `Response.json` (see `src/http/envelope.ts`).
 *
 * Every filter, sort, pagination, and validation rule is carried over
 * unchanged, so the Worker's envelopes stay byte-identical to the spike's for
 * the same inputs.
 *
 * Bodies are static projections of `OPPORTUNITY_FIXTURES`, so repeat calls
 * return identical results and the list, detail, and search endpoints resolve
 * to the same records.
 */

import {
  allForVersion,
  getById,
  shapeOpportunityForVersion,
  type Opportunity,
  type Version,
} from "../data/fixtures";
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
  type MoneyRangeFilter,
  type StringArrayFilter,
} from "../http/query";

/** Wire values of `Models.OppSortBy` (`lib/core/lib/core/models/opportunity/search.tsp`). */
const VALID_SORT_BY = new Set([
  "lastModifiedAt",
  "createdAt",
  "title",
  "status.value",
  "keyDates.closeDate",
  "funding.maxAwardAmount",
  "funding.minAwardAmount",
  "funding.totalAmountAvailable",
  "funding.estimatedAwardCount",
  "custom",
]);

/** The string-array filter fields of `Models.OppFilters`. */
const ARRAY_FILTER_FIELDS = ["status"] as const;

/** The money-range filter fields of `Models.OppFilters`. */
const MONEY_RANGE_FIELDS = [
  "totalFundingAvailableRange",
  "minAwardAmountRange",
  "maxAwardAmountRange",
] as const;

interface OppFilters {
  status?: StringArrayFilter;
  closeDateRange?: DateRangeFilter;
  totalFundingAvailableRange?: MoneyRangeFilter;
  minAwardAmountRange?: MoneyRangeFilter;
  maxAwardAmountRange?: MoneyRangeFilter;
  customFilters?: Record<string, unknown>;
}

interface OppSorting {
  sortBy: string;
  customSortBy?: string;
  sortOrder?: string;
}

interface SearchRequestBody {
  search?: string;
  filters?: OppFilters;
  sorting?: OppSorting;
  pagination?: { page?: number; pageSize?: number };
}

/** Extracts the field an `OppSortBy` wire value sorts on, as a string or number. */
function sortKey(opp: Opportunity, sortBy: string): string | number {
  switch (sortBy) {
    case "lastModifiedAt":
      return new Date(opp.lastModifiedAt).getTime();
    case "createdAt":
      return new Date(opp.createdAt).getTime();
    case "title":
      return opp.title;
    case "status.value":
      return opp.status.value;
    case "keyDates.closeDate":
      return dateTime(opp.keyDates?.closeDate?.date) ?? 0;
    case "funding.maxAwardAmount":
      return moneyAmount(opp.funding?.maxAwardAmount) ?? 0;
    case "funding.minAwardAmount":
      return moneyAmount(opp.funding?.minAwardAmount) ?? 0;
    case "funding.totalAmountAvailable":
      return moneyAmount(opp.funding?.totalAmountAvailable) ?? 0;
    case "funding.estimatedAwardCount":
      return opp.funding?.estimatedAwardCount ?? 0;
    default:
      // "custom" (application-defined field) - no built-in ordering to apply.
      return 0;
  }
}

/**
 * `GET /v{version}/common-grants/opportunities` — the paginated list, ordered
 * newest-modified first.
 *
 * @param request - Carries the `page`/`pageSize` query params.
 * @param version - Protocol version to shape responses for (v0.1 omits
 * `acceptedApplicantTypes`; `competitions` is detail-only, so never present here).
 */
export function listOpportunities(
  request: Request,
  version: Version,
): Response {
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
    allForVersion(version),
    (opp) => sortKey(opp, "lastModifiedAt"),
    "desc",
  );

  return successResponse({
    items: pageOf(sorted, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, sorted.length),
  });
}

/**
 * `GET /v{version}/common-grants/opportunities/{oppId}` — a single record.
 *
 * @param oppId - The path segment as received; validated as UUID-shaped here
 * rather than in the router, so a malformed id answers 400 (not a route miss).
 * @param version - Protocol version to shape the response for (v0.1 returns the
 * `OpportunityBase` shape rather than `OpportunityDetails`).
 */
export function getOpportunity(oppId: string, version: Version): Response {
  if (!isUuid(oppId)) {
    return errorResponse(400, "Invalid opportunity id", [
      { field: "oppId", message: "Must be a valid UUID" },
    ]);
  }

  const opp = getById(oppId);
  if (!opp) {
    return errorResponse(404, "Opportunity not found", [
      { field: "oppId", message: `No opportunity found with id ${oppId}` },
    ]);
  }

  return successResponse({
    data: shapeOpportunityForVersion(opp, version, "detail"),
  });
}

/**
 * `POST /v{version}/common-grants/opportunities/search` — filtered, sorted,
 * paginated search over the same fixture set.
 *
 * @param request - Carries the `OppSearchRequest` JSON body.
 * @param version - Protocol version to shape the returned items for.
 */
export async function searchOpportunities(
  request: Request,
  version: Version,
): Promise<Response> {
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
  for (const field of ["closeDateRange", ...MONEY_RANGE_FIELDS] as const) {
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
    // Validate the bounds themselves, not just their presence. An
    // malformed bound used to be silently dropped, which returned a
    // result set that contradicted the filter the caller asked for.
    const isDateRange = field === "closeDateRange";
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
  // The defaults here are unreachable: an invalid pagination pair pushed
  // errors above, and the guard below returns before they are used.
  const { page, pageSize } = pagination.ok
    ? pagination
    : { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };

  if (errors.length > 0) {
    return errorResponse(400, "Invalid search request", errors);
  }

  let items = allForVersion(version);

  if (body.search) {
    const q = body.search.toLowerCase();
    items = items.filter(
      (opp) =>
        opp.title.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q),
    );
  }
  if (filters.status) {
    items = applyStringArrayFilter(
      items,
      filters.status,
      (opp) => opp.status.value,
    );
  }
  if (filters.closeDateRange) {
    items = applyDateRangeFilter(items, filters.closeDateRange, (opp) =>
      dateTime(opp.keyDates?.closeDate?.date),
    );
  }
  if (filters.totalFundingAvailableRange) {
    items = applyMoneyRangeFilter(
      items,
      filters.totalFundingAvailableRange,
      (opp) => opp.funding?.totalAmountAvailable,
    );
  }
  if (filters.minAwardAmountRange) {
    items = applyMoneyRangeFilter(
      items,
      filters.minAwardAmountRange,
      (opp) => opp.funding?.minAwardAmount,
    );
  }
  if (filters.maxAwardAmountRange) {
    items = applyMoneyRangeFilter(
      items,
      filters.maxAwardAmountRange,
      (opp) => opp.funding?.maxAwardAmount,
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
    items = orderBy(items, (opp) => sortKey(opp, sortBy), sortOrder);
  }

  // `filterInfo.errors` is the spec's channel for "non-fatal errors that
  // occurred during filtering". `customFilters` are implementation-defined,
  // so this mock echoes them but can't apply them — say so rather than
  // letting the echo imply they narrowed the results.
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
