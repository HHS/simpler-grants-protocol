import { http, HttpResponse, type HttpHandler } from "msw";
import {
  OPPORTUNITY_FIXTURES,
  allForVersion,
  getById,
  shapeOpportunityForVersion,
  type Opportunity,
  type Version,
} from "./fixtures";

const LIST_PATH = "/common-grants/opportunities";
const DETAIL_PATH = "/common-grants/opportunities/:oppId";
const SEARCH_PATH = "/common-grants/opportunities/search";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;

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

const VALID_SORT_ORDER = new Set(["asc", "desc"]);
const VALID_ARRAY_OPERATORS = new Set(["in", "notIn"]);
const VALID_RANGE_OPERATORS = new Set(["between", "outside"]);

interface StringArrayFilter {
  operator: string;
  value: string[];
}

interface RangeFilter {
  operator: string;
  value: {
    min: string | { amount: string; currency: string };
    max: string | { amount: string; currency: string };
  };
}

interface OppFilters {
  status?: StringArrayFilter;
  closeDateRange?: RangeFilter;
  totalFundingAvailableRange?: RangeFilter;
  minAwardAmountRange?: RangeFilter;
  maxAwardAmountRange?: RangeFilter;
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

/** A single `{field, message}` validation error, matching the T5 error-envelope convention. */
interface FieldError {
  field: string;
  message: string;
}

function moneyAmount(value: unknown): number | undefined {
  if (value && typeof value === "object" && "amount" in value) {
    return Number((value as { amount: string }).amount);
  }
  return undefined;
}

function dateTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/** Applies a `StringArrayFilter` (`in`/`notIn`) over the `status.value` field. */
function applyStatusFilter(
  items: Opportunity[],
  filter: StringArrayFilter,
): Opportunity[] {
  const allowed = new Set(filter.value);
  return items.filter((opp) => {
    const inSet = allowed.has(opp.status.value);
    return filter.operator === "notIn" ? !inSet : inSet;
  });
}

/**
 * Applies a date `RangeFilter` (`between`/`outside`) over a field extracted by
 * `getValue`. Either bound may be omitted (filters on the one given).
 */
function applyDateRangeFilter(
  items: Opportunity[],
  filter: RangeFilter,
  getValue: (opp: Opportunity) => number | undefined,
): Opportunity[] {
  const min =
    filter.value.min !== undefined
      ? dateTime(filter.value.min as string)
      : undefined;
  const max =
    filter.value.max !== undefined
      ? dateTime(filter.value.max as string)
      : undefined;

  return items.filter((opp) => {
    const value = getValue(opp);
    if (value === undefined) return false;
    const inRange =
      (min === undefined || value >= min) &&
      (max === undefined || value <= max);
    return filter.operator === "outside" ? !inRange : inRange;
  });
}

/**
 * Applies a `MoneyRangeFilter` (`between`/`outside`) over a `Money` field
 * extracted by `getMoney`. Either bound may be omitted (filters on the one
 * given). Per the protocol (`totalFundingAvailableRange` et al. in
 * `lib/core/lib/core/models/opportunity/search.tsp`), amounts denominated in a
 * different currency than the filter bound are excluded from the match
 * regardless of `operator`.
 */
function applyMoneyRangeFilter(
  items: Opportunity[],
  filter: RangeFilter,
  getMoney: (
    opp: Opportunity,
  ) => { amount: string; currency: string } | undefined,
): Opportunity[] {
  const minBound = filter.value.min as
    | { amount: string; currency: string }
    | undefined;
  const maxBound = filter.value.max as
    | { amount: string; currency: string }
    | undefined;
  const currency = minBound?.currency ?? maxBound?.currency;
  const min = minBound ? Number(minBound.amount) : undefined;
  const max = maxBound ? Number(maxBound.amount) : undefined;

  return items.filter((opp) => {
    const money = getMoney(opp);
    if (!money) return false;
    if (currency !== undefined && money.currency !== currency) return false;
    const value = Number(money.amount);
    const inRange =
      (min === undefined || value >= min) &&
      (max === undefined || value <= max);
    return filter.operator === "outside" ? !inRange : inRange;
  });
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

function compare(a: string | number, b: string | number): number {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b));
  }
  return a - b;
}

/** RFC 4122 UUID (any version/variant), matching the protocol's `uuid` format. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds the protocol `Error` envelope (`status`, `message`, `errors`). */
function errorResponse(
  status: number,
  message: string,
  errors: unknown[],
): Response {
  return HttpResponse.json({ status, message, errors }, { status });
}

/**
 * Deterministic, fixture-backed MSW handlers for the CommonGrants opportunity
 * list and detail endpoints (#1034-T5). Bodies are static projections of
 * `OPPORTUNITY_FIXTURES`, so repeat calls return identical results, and the
 * list and detail endpoints resolve to the same records (must-do #1 and #2).
 *
 * @param version - Protocol version to shape responses for (v0.1 omits
 * `acceptedApplicantTypes`/`competitions`; v0.1 detail returns the
 * `OpportunityBase` shape rather than `OpportunityDetails`).
 */
export function buildOpportunityHandlers(version: Version): HttpHandler[] {
  return [
    http.get(LIST_PATH, ({ request }) => {
      const url = new URL(request.url);
      const page = Math.max(
        1,
        parseInt(url.searchParams.get("page") ?? String(DEFAULT_PAGE), 10) ||
          DEFAULT_PAGE,
      );
      const pageSize = Math.max(
        1,
        Math.min(
          100,
          parseInt(
            url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
            10,
          ) || DEFAULT_PAGE_SIZE,
        ),
      );

      const sorted = allForVersion(version).sort(
        (a, b) =>
          new Date(b.lastModifiedAt).getTime() -
          new Date(a.lastModifiedAt).getTime(),
      );
      const start = (page - 1) * pageSize;
      const items = sorted.slice(start, start + pageSize);

      return HttpResponse.json({
        status: 200,
        message: "Success",
        items,
        paginationInfo: {
          page,
          pageSize,
          totalItems: OPPORTUNITY_FIXTURES.length,
          totalPages: Math.ceil(OPPORTUNITY_FIXTURES.length / pageSize),
        },
      });
    }),

    http.get(DETAIL_PATH, ({ params }) => {
      const oppId = String(params.oppId);

      if (!UUID_PATTERN.test(oppId)) {
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

      return HttpResponse.json({
        status: 200,
        message: "Success",
        data: shapeOpportunityForVersion(opp, version, "detail"),
      });
    }),

    http.post(SEARCH_PATH, async ({ request }) => {
      let body: SearchRequestBody;
      try {
        body = (await request.json()) as SearchRequestBody;
      } catch {
        return errorResponse(400, "Malformed JSON body", [
          { field: "body", message: "Request body must be valid JSON" },
        ]);
      }

      const errors: FieldError[] = [];
      const filters = body.filters ?? {};
      const sorting = body.sorting;

      if (sorting) {
        if (!VALID_SORT_BY.has(sorting.sortBy)) {
          errors.push({
            field: "sorting.sortBy",
            message: `Unknown sort field: ${String(sorting.sortBy)}`,
          });
        }
        if (
          sorting.sortOrder !== undefined &&
          !VALID_SORT_ORDER.has(sorting.sortOrder)
        ) {
          errors.push({
            field: "sorting.sortOrder",
            message: `Unknown sort order: ${String(sorting.sortOrder)}`,
          });
        }
      }
      if (filters.status) {
        if (!VALID_ARRAY_OPERATORS.has(filters.status.operator)) {
          errors.push({
            field: "filters.status.operator",
            message: `Unknown array operator: ${String(filters.status.operator)}`,
          });
        } else if (!Array.isArray(filters.status.value)) {
          errors.push({
            field: "filters.status.value",
            message: "Must be an array of strings",
          });
        }
      }
      for (const field of [
        "closeDateRange",
        "totalFundingAvailableRange",
        "minAwardAmountRange",
        "maxAwardAmountRange",
      ] as const) {
        const filter = filters[field];
        if (!filter) continue;
        if (!VALID_RANGE_OPERATORS.has(filter.operator)) {
          errors.push({
            field: `filters.${field}.operator`,
            message: `Unknown range operator: ${String(filter.operator)}`,
          });
        } else if (
          !filter.value ||
          typeof filter.value !== "object" ||
          (filter.value.min === undefined && filter.value.max === undefined)
        ) {
          errors.push({
            field: `filters.${field}.value`,
            message: "Must include at least one of min or max",
          });
        }
      }

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
        items = applyStatusFilter(items, filters.status);
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
        items = [...items].sort((a, b) => {
          const result = compare(sortKey(a, sortBy), sortKey(b, sortBy));
          return sortOrder === "asc" ? result : -result;
        });
      }

      const page = Math.max(1, body.pagination?.page ?? DEFAULT_PAGE);
      const pageSize = Math.max(
        1,
        Math.min(100, body.pagination?.pageSize ?? DEFAULT_PAGE_SIZE),
      );
      const start = (page - 1) * pageSize;
      const totalItems = items.length;
      const pageItems = items.slice(start, start + pageSize);

      return HttpResponse.json({
        status: 200,
        message: "Success",
        items: pageItems,
        paginationInfo: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize) || 1,
        },
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
        },
      });
    }),
  ];
}
