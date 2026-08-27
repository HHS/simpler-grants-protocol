/**
 * Pagination, sorting, filtering, and body-parsing primitives shared by every
 * resource handler (#3C-2-T1).
 *
 * All of this began life inline in `handlers/opportunities.ts` (#1077-T3), where
 * it was the only copy. Extending the mock past opportunities would have meant
 * five more copies of the same `page`/`pageSize` validation, the same
 * total-order sort, and the same `between`/`outside` range semantics — five
 * more places for the protocol's rules to drift apart. So the primitives moved
 * here and the opportunity handler now calls them.
 *
 * The extraction is behavior-preserving by construction: the generic helpers
 * take a value extractor where the originals hard-coded an opportunity field,
 * and nothing else changed. `__tests__/lib/mock/golden-envelopes.spec.ts`
 * compares raw response text for the opportunity endpoints against a corpus
 * captured from the 3A Worker, so any drift in these rules — a different
 * default, a lost tiebreaker, a reordered error list — fails there rather than
 * being discovered in a preview.
 *
 * Nothing here knows about a resource. Anything resource-specific — which sort
 * fields are legal, which filters exist — stays in that resource's handler.
 */

import { errorResponse, type FieldError } from "./envelope";

/** Spec defaults for `Pagination.PaginatedQueryParams` / `PaginatedBodyParams`. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 100;
/** Both params declare `minimum: 1` and no maximum. */
const MIN_PAGE_VALUE = 1;

/**
 * UUID-shaped value (8-4-4-4-12 hex, matching the protocol's `uuid` format).
 * Not a full RFC 4122 conformance check — it deliberately accepts the nil
 * UUID (`00000000-…`), which every resource uses as its "well-formed but
 * unknown" case (`RESERVED_MISSING_ID`).
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is UUID-shaped per `UUID_PATTERN`. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** A monetary amount and its ISO 4217 currency (mirrors `Fields.Money`). */
export interface Money {
  amount: string;
  currency: string;
}

/**
 * The filter shapes below describe what a *well-formed* request looks like.
 * Bodies arrive as untrusted JSON, so each handler validates every field —
 * operator, bound presence, and bound value — and answers 400 before any of
 * these types are relied on.
 */
export interface StringArrayFilter {
  operator: string;
  value: string[];
}

export interface DateRangeFilter {
  operator: string;
  value: { min?: string; max?: string };
}

export interface MoneyRangeFilter {
  operator: string;
  value: { min?: Money; max?: Money };
}

export const VALID_SORT_ORDER = new Set(["asc", "desc"]);
export const VALID_ARRAY_OPERATORS = new Set(["in", "notIn"]);
export const VALID_RANGE_OPERATORS = new Set(["between", "outside"]);

/** Reads the numeric `amount` off a `Money`-shaped value, or `undefined`. */
export function moneyAmount(value: unknown): number | undefined {
  if (value && typeof value === "object" && "amount" in value) {
    const amount = Number((value as { amount: string }).amount);
    return Number.isFinite(amount) ? amount : undefined;
  }
  return undefined;
}

/** Parses an ISO 8601 string to epoch milliseconds, or `undefined`. */
export function dateTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/** True if `value` is a `Money` object whose `amount` parses as a number. */
export function isMoney(value: unknown): value is Money {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Money).currency === "string" &&
    moneyAmount(value) !== undefined
  );
}

/** Orders two sort keys, comparing as strings whenever either side is one. */
function compare(a: string | number, b: string | number): number {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b));
  }
  return a - b;
}

/**
 * Orders items by an extracted sort key, breaking ties on `id`. The tiebreaker
 * makes the ordering a total order: without it, records sharing a sort value
 * keep their incoming order under a stable sort, so `desc` would not be the
 * exact reverse of `asc`. Negating the composed comparator — tiebreaker
 * included — is what makes the two directions mirror each other exactly.
 *
 * @param items - Records to order; the input array is not mutated.
 * @param sortKey - Extracts the value to order by from one record.
 * @param sortOrder - `"asc"`, or anything else for descending.
 */
export function orderBy<T extends { id: string }>(
  items: T[],
  sortKey: (item: T) => string | number,
  sortOrder: string,
): T[] {
  return [...items].sort((a, b) => {
    const result = compare(sortKey(a), sortKey(b)) || compare(a.id, b.id);
    return sortOrder === "asc" ? result : -result;
  });
}

/**
 * Applies a `StringArrayFilter` (`in`/`notIn`) over a string field extracted by
 * `getValue`.
 */
export function applyStringArrayFilter<T>(
  items: T[],
  filter: StringArrayFilter,
  getValue: (item: T) => string,
): T[] {
  const allowed = new Set(filter.value);
  return items.filter((item) => {
    const inSet = allowed.has(getValue(item));
    return filter.operator === "notIn" ? !inSet : inSet;
  });
}

/**
 * Applies a date `RangeFilter` (`between`/`outside`) over a field extracted by
 * `getValue`. Either bound may be omitted (filters on the one given); a record
 * whose field is absent never matches, whichever operator was asked for.
 */
export function applyDateRangeFilter<T>(
  items: T[],
  filter: DateRangeFilter,
  getValue: (item: T) => number | undefined,
): T[] {
  const min = dateTime(filter.value.min);
  const max = dateTime(filter.value.max);

  return items.filter((item) => {
    const value = getValue(item);
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
 * given). Per the protocol, amounts denominated in a different currency than
 * the filter bound are excluded from the match regardless of `operator`.
 */
export function applyMoneyRangeFilter<T>(
  items: T[],
  filter: MoneyRangeFilter,
  getMoney: (item: T) => Money | undefined,
): T[] {
  const { min: minBound, max: maxBound } = filter.value;
  const currency = minBound?.currency ?? maxBound?.currency;
  const min = moneyAmount(minBound);
  const max = moneyAmount(maxBound);

  return items.filter((item) => {
    const money = getMoney(item);
    if (!money) return false;
    if (currency !== undefined && money.currency !== currency) return false;
    const value = Number(money.amount);
    const inRange =
      (min === undefined || value >= min) &&
      (max === undefined || value <= max);
    return filter.operator === "outside" ? !inRange : inRange;
  });
}

/** A `Sorting.SortBodyParams` as received — untrusted until validated. */
export interface SortingRequest {
  sortBy: string;
  customSortBy?: string;
  sortOrder?: string;
}

/**
 * Validates a `sorting` block against a resource's own legal sort fields.
 *
 * The *set* of legal fields is per-resource (`OppSortBy`, `AwdSortBy`,
 * `AppSortBy` name different things), but the checks over that set — is the
 * field known, is the order one of `asc`/`desc` — are identical everywhere, and
 * so are the error messages. Three copies of them meant three chances for one
 * resource's phrasing to drift from the others'.
 *
 * @param sorting - The block as received, or `undefined` when omitted.
 * @param validSortBy - Wire values this resource's `*SortBy` enum permits.
 * @param errors - Collector appended to for each problem found.
 */
export function validateSorting(
  sorting: SortingRequest | undefined,
  validSortBy: ReadonlySet<string>,
  errors: FieldError[],
): void {
  if (!sorting) return;

  if (!validSortBy.has(sorting.sortBy)) {
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

/**
 * Validates each named `StringArrayFilter` on a filters object: a known
 * `in`/`notIn` operator and an array value.
 *
 * Like `validateSorting`, only the field *names* are per-resource. The range
 * filters are deliberately NOT covered here — those genuinely differ by resource
 * (a date range and a money range validate their bounds differently, and the
 * resources have different numbers of them), so folding them in would trade real
 * duplication for a parameter list nobody can read.
 *
 * Generic over the field names rather than taking `Record<string, unknown>`, so
 * a resource passing a field its own `*Filters` interface does not declare is a
 * compile error rather than a silently skipped check.
 *
 * @param fields - Filter names to check, from the resource's `*DefaultFilters`.
 * @param filters - The filters object as received.
 * @param errors - Collector appended to for each problem found.
 */
export function validateArrayFilters<Field extends string>(
  fields: readonly Field[],
  filters: Partial<Record<Field, StringArrayFilter>>,
  errors: FieldError[],
): void {
  for (const field of fields) {
    const filter = filters[field];
    if (!filter) continue;

    if (!VALID_ARRAY_OPERATORS.has(filter.operator)) {
      errors.push({
        field: `filters.${field}.operator`,
        message: `Unknown array operator: ${String(filter.operator)}`,
      });
    } else if (!Array.isArray(filter.value)) {
      errors.push({
        field: `filters.${field}.value`,
        message: "Must be an array of strings",
      });
    }
  }
}

/** A resolved pagination pair, or the validation errors that blocked it. */
export type PaginationResult =
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
 * @param errors - Collector appended to on failure.
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
export function resolvePagination(
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

/** Reads `page`/`pageSize` off a request's query string and resolves them. */
export function resolveQueryPagination(request: Request): PaginationResult {
  const url = new URL(request.url);
  return resolvePagination(
    url.searchParams.get("page") ?? undefined,
    url.searchParams.get("pageSize") ?? undefined,
  );
}

/**
 * Builds `Pagination.PaginatedResultsInfo`. Shared by every list and search
 * endpoint so `totalPages` is derived the same way on all of them — an empty
 * result set reports zero pages, not one.
 */
export function paginationInfo(
  page: number,
  pageSize: number,
  totalItems: number,
) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

/** Slices one page out of an ordered result set. */
export function pageOf<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** A parsed JSON object body, or the response that should be returned instead. */
export type JsonObjectBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response };

/**
 * Reads a request body as a JSON *object*, answering 400 for anything else.
 *
 * `JSON.parse` accepts any JSON *value*, so `null`, `[]`, `42`, and a bare
 * quoted string all clear the parse and then pose as a request model. The #1049
 * spike cast straight to its body type and read `.filters`, which crashed on
 * `null`/strings and — worse — quietly answered 200 with the whole unfiltered
 * set for `[]`/`42`/`true`, since those have no `.filters` to find. Rejecting
 * non-objects here is the only way the caller learns the body was wrong.
 *
 * `allowEmpty` covers write endpoints that take no body: `PUT /{appId}/submit`
 * accepts none at all, so an empty string is a valid request there and an object
 * everywhere else.
 */
export async function readJsonObjectBody(
  request: Request,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): Promise<JsonObjectBody> {
  const raw = await request.text();
  if (raw.trim() === "") {
    if (allowEmpty) return { ok: true, body: {} };
    return {
      ok: false,
      response: errorResponse(400, "Malformed JSON body", [
        { field: "body", message: "Request body must be valid JSON" },
      ]),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "Malformed JSON body", [
        { field: "body", message: "Request body must be valid JSON" },
      ]),
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      response: errorResponse(400, "Malformed JSON body", [
        { field: "body", message: "Request body must be a JSON object" },
      ]),
    };
  }

  return { ok: true, body: parsed as Record<string, unknown> };
}
