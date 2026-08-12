/**
 * Deterministic, fixture-backed handlers for the CommonGrants opportunity list,
 * detail, and search endpoints (#1077-T3).
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
  type Money,
  type Opportunity,
  type Version,
} from "../data/fixtures";
import {
  errorResponse,
  successResponse,
  type FieldError,
} from "../http/envelope";

/** Spec defaults for `Pagination.PaginatedQueryParams` / `PaginatedBodyParams`. */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;
/** Both params declare `minimum: 1` and no maximum. */
const MIN_PAGE_VALUE = 1;

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

/**
 * The filter/sort/pagination shapes below describe what a *well-formed* request
 * body looks like. Bodies arrive as untrusted JSON, so the search handler
 * validates every field — operator, bound presence, and bound value — and
 * answers 400 before any of these types are relied on.
 */
interface StringArrayFilter {
  operator: string;
  value: string[];
}

interface DateRangeFilter {
  operator: string;
  value: { min?: string; max?: string };
}

interface MoneyRangeFilter {
  operator: string;
  value: { min?: Money; max?: Money };
}

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

function moneyAmount(value: unknown): number | undefined {
  if (value && typeof value === "object" && "amount" in value) {
    const amount = Number((value as { amount: string }).amount);
    return Number.isFinite(amount) ? amount : undefined;
  }
  return undefined;
}

function dateTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/** True if `value` is a `Money` object whose `amount` parses as a number. */
function isMoney(value: unknown): value is Money {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Money).currency === "string" &&
    moneyAmount(value) !== undefined
  );
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
  filter: DateRangeFilter,
  getValue: (opp: Opportunity) => number | undefined,
): Opportunity[] {
  const min = dateTime(filter.value.min);
  const max = dateTime(filter.value.max);

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
  filter: MoneyRangeFilter,
  getMoney: (opp: Opportunity) => Money | undefined,
): Opportunity[] {
  const { min: minBound, max: maxBound } = filter.value;
  const currency = minBound?.currency ?? maxBound?.currency;
  const min = moneyAmount(minBound);
  const max = moneyAmount(maxBound);

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

/**
 * Orders items by `sortBy`, breaking ties on `id`. The tiebreaker makes the
 * ordering a total order: without it, records sharing a sort value (two
 * opportunities with the same `funding.maxAwardAmount`, say) keep their
 * incoming order under a stable sort, so `desc` would not be the exact reverse
 * of `asc`. Negating the composed comparator — tiebreaker included — is what
 * makes the two directions mirror each other exactly.
 */
function orderBy(
  items: Opportunity[],
  sortBy: string,
  sortOrder: string,
): Opportunity[] {
  return [...items].sort((a, b) => {
    const result =
      compare(sortKey(a, sortBy), sortKey(b, sortBy)) || compare(a.id, b.id);
    return sortOrder === "asc" ? result : -result;
  });
}

/** A resolved pagination pair, or the validation errors that blocked it. */
type PaginationResult =
  | { ok: true; page: number; pageSize: number }
  | { ok: false; errors: FieldError[] };

/**
 * Resolves one pagination param against the spec
 * (`Pagination.PaginatedQueryParams` / `PaginatedBodyParams`): an optional
 * `integer` with `minimum: 1`, defaulting to 1 (`page`) / 100 (`pageSize`), and
 * **no** declared maximum.
 *
 * An absent value takes the default. A present value that isn't an integer, or
 * that falls below the minimum, is a validation error rather than something to
 * silently clamp — clamping would answer a request the caller didn't make, and
 * surfacing it as a 400 gives the playground another error case to demonstrate.
 *
 * @param raw - The value as received: a query string, a JSON body value, or
 * `undefined`/`""` when the caller omitted it.
 * @param field - Dotted path used in the `{field, message}` error entry.
 * @param fallback - The spec default for this param.
 */
function resolvePaginationParam(
  raw: string | number | undefined,
  field: string,
  fallback: number,
  errors: FieldError[],
): number {
  if (raw === undefined || raw === "") return fallback;

  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value)) {
    errors.push({ field, message: `Must be an integer, received: ${raw}` });
    return fallback;
  }
  if (value < MIN_PAGE_VALUE) {
    errors.push({ field, message: `Must be at least ${MIN_PAGE_VALUE}` });
    return fallback;
  }
  return value;
}

/** Resolves both pagination params, collecting every validation error at once. */
function resolvePagination(
  rawPage: string | number | undefined,
  rawPageSize: string | number | undefined,
  fieldPrefix = "",
): PaginationResult {
  const errors: FieldError[] = [];
  const page = resolvePaginationParam(
    rawPage,
    `${fieldPrefix}page`,
    DEFAULT_PAGE,
    errors,
  );
  const pageSize = resolvePaginationParam(
    rawPageSize,
    `${fieldPrefix}pageSize`,
    DEFAULT_PAGE_SIZE,
    errors,
  );

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, page, pageSize };
}

/**
 * UUID-shaped value (8-4-4-4-12 hex, matching the protocol's `uuid` format).
 * Not a full RFC 4122 conformance check — it deliberately accepts the nil
 * UUID (`00000000-…`), used as this suite's "well-formed but unknown" case.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Builds `Pagination.PaginatedResultsInfo`. Shared by the list and search
 * endpoints so `totalPages` is derived the same way on both — an empty result
 * set reports zero pages, not one.
 */
function paginationInfo(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
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
  const url = new URL(request.url);
  const pagination = resolvePagination(
    url.searchParams.get("page") ?? undefined,
    url.searchParams.get("pageSize") ?? undefined,
  );
  if (!pagination.ok) {
    return errorResponse(
      400,
      "Invalid pagination parameters",
      pagination.errors,
    );
  }
  const { page, pageSize } = pagination;

  const sorted = orderBy(allForVersion(version), "lastModifiedAt", "desc");
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return successResponse({
    items,
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
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(400, "Malformed JSON body", [
      { field: "body", message: "Request body must be valid JSON" },
    ]);
  }

  // `JSON.parse` accepts any JSON *value*, so `null`, `[]`, `42`, and a bare
  // quoted string all clear the parse above and then pose as an
  // `OppSearchRequest`. The spike cast straight to `SearchRequestBody` and read
  // `.filters`, which crashed on `null`/strings and — worse — quietly answered
  // 200 with the whole unfiltered set for `[]`/`42`/`true`, since those have no
  // `.filters` to find. Rejecting non-objects here is the only way the caller
  // learns the body was wrong. (This is the one deliberate behavior change from
  // the #1049 port; every input that produced an envelope there still produces
  // the same envelope.)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return errorResponse(400, "Malformed JSON body", [
      { field: "body", message: "Request body must be a JSON object" },
    ]);
  }
  const body = parsed as SearchRequestBody;

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
    items = orderBy(items, sortBy, sortOrder);
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

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return successResponse({
    items: pageItems,
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
