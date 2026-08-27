/**
 * Pagination, sorting, filtering, and body-parsing primitives shared by every
 * resource handler. Nothing here knows about a resource — legal sort fields
 * and filter names stay in each handler.
 */

import { errorResponse, type FieldError } from "./envelope";

/** Spec defaults for `Pagination.PaginatedQueryParams` / `PaginatedBodyParams`. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 100;
/** Both params declare `minimum: 1` and no maximum. */
const MIN_PAGE_VALUE = 1;

/**
 * UUID-shaped value (8-4-4-4-12 hex). Deliberately accepts the nil UUID,
 * which every resource uses as its "well-formed but unknown" id.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** A monetary amount and its ISO 4217 currency (mirrors `Fields.Money`). */
export interface Money {
  amount: string;
  currency: string;
}

/**
 * Well-formed filter shapes. Bodies are untrusted JSON, so handlers validate
 * every field and answer 400 before relying on these types.
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
 * makes the ordering total, so `desc` is the exact reverse of `asc`.
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

/** Applies a `StringArrayFilter` (`in`/`notIn`) over an extracted string field. */
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
 * Applies a date `RangeFilter` (`between`/`outside`). Either bound may be
 * omitted; a record whose field is absent never matches.
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
 * Applies a `MoneyRangeFilter` (`between`/`outside`). Per the protocol,
 * amounts in a different currency than the filter bound never match.
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

/** Validates a `sorting` block against a resource's own legal sort fields. */
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
 * Validates each named `StringArrayFilter`: a known `in`/`notIn` operator and
 * an array value. Range filters validate per resource, not here.
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
 * Resolves one pagination param (optional integer, `minimum: 1`, no maximum).
 * A non-integer or below-minimum value is a 400, not silently clamped.
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
 * Builds `Pagination.PaginatedResultsInfo`. An empty result set reports zero
 * pages, not one.
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
 * Valid-JSON non-objects (`null`, arrays, scalars) are rejected on purpose —
 * they would otherwise pose as an empty request. `allowEmpty` covers write
 * endpoints that take no body.
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
