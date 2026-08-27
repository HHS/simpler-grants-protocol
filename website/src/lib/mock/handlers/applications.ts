/**
 * Deterministic, fixture-backed handlers for the applications and form-response
 * endpoints (#3C-2-T1).
 *
 * Six operations across two route interfaces (`Routes.Applications` and
 * `Routes.FormResponses`), all mounted under `/applications` by `api.tsp`, which
 * is why they share one module: `PUT /{appId}/forms/{formId}` and
 * `PUT /{appId}/submit` are sibling paths, and splitting them across files would
 * put the two halves of one resource's routing in two places.
 *
 * **Writes are validate-and-echo, and stateless.** `POST /start`,
 * `PUT /{appId}/submit`, and `PUT /{appId}/forms/{formId}` validate their input
 * and return the record the write *would* have produced, without retaining
 * anything. So `POST /start` reports one reserved draft id
 * (`DRAFT_APPLICATION_ID`) on every call and a following
 * `GET /applications/{that id}` answers 404; a form response written by a caller
 * is echoed but does not change what the next `GET` of it returns. See the
 * module docstring in `handlers/organizations.ts` for why a module-level store
 * was rejected.
 *
 * **Two spec quirks are handled here rather than smoothed over:**
 *
 * 1. `startApplication`'s title field is `@renamedFrom(Versions.v0_4, "name")`,
 *    so the *request* field is `name` in v0.2/v0.3 and `title` in v0.4. The
 *    handler reads whichever the request's version prefix calls for, and rejects
 *    the other — accepting both would teach a caller a field name their target
 *    version's spec doesn't document.
 *
 * 2. `searchApplications` declares `filters` and `sorting` as **required query
 *    parameters** (`@query`), not a request body — unlike every other search in
 *    the spec, which takes a JSON body. That is almost certainly an oversight in
 *    `core/routes/applications.tsp`, and it is a poor fit for the shape of the
 *    data (a deeply nested filter object url-encoded into a query string). The
 *    mock accepts **both**: query params, as published, and a JSON body, as every
 *    sibling search does. Deliberate leniency, in the one direction that cannot
 *    mislead — a caller following the published spec works, and a caller
 *    following the pattern the rest of the API establishes also works. Flagged
 *    as a protocol finding rather than silently normalized.
 */

import {
  DRAFT_APPLICATION_ID,
  allApplications,
  getApplicationById,
  getFormResponse,
  type Application,
  type AppFormResponse,
} from "../data/applications";
import {
  APPLICATION_SEARCH_MIN_VERSION,
  isAtLeastVersion,
} from "../data/availability";
import { getCompetitionById } from "../data/competitions";
import type { Version } from "../data/fixtures";
import { getFormById } from "../data/forms";
import {
  createdResponse,
  errorResponse,
  successResponse,
  type FieldError,
} from "../http/envelope";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  VALID_RANGE_OPERATORS,
  applyDateRangeFilter,
  applyStringArrayFilter,
  dateTime,
  isUuid,
  orderBy,
  pageOf,
  paginationInfo,
  readJsonObjectBody,
  resolvePagination,
  validateArrayFilters,
  validateSorting,
  type DateRangeFilter,
  type StringArrayFilter,
} from "../http/query";

/** Wire values of `Models.AppSortBy` (`lib/core/lib/core/models/application.tsp`). */
const VALID_SORT_BY = new Set([
  "lastModifiedAt",
  "createdAt",
  "title",
  "status.value",
  "submittedAt",
  "custom",
]);

/** The string-array filter fields of `Models.AppDefaultFilters`. */
const ARRAY_FILTER_FIELDS = ["status", "competitionId"] as const;

/** Filters accepted on `POST /applications/search` (`Models.AppFilters`). */
interface AppFilters {
  status?: StringArrayFilter;
  competitionId?: StringArrayFilter;
  submittedAtRange?: DateRangeFilter;
  customFilters?: Record<string, unknown>;
}

interface AppSorting {
  sortBy: string;
  customSortBy?: string;
  sortOrder?: string;
}

interface SearchRequest {
  search?: string;
  filters?: AppFilters;
  sorting?: AppSorting;
  pagination?: { page?: number; pageSize?: number };
}

/**
 * The timestamp stamped on an echoed record.
 *
 * Fixed rather than `new Date()`, for the same reason as
 * `handlers/organizations.ts`: a wall-clock value would make every response
 * differ and break the determinism the fixture suites assert.
 */
const ECHOED_AT = "2026-06-22T00:00:00Z";

/** The id every echoed form response reports. */
const ECHOED_FORM_RESPONSE_ID = "8b9c0d1e-2f30-4415-8a2b-3c4d5e6f7081";

/** Extracts the field an `AppSortBy` wire value sorts on. */
function sortKey(application: Application, sortBy: string): string | number {
  switch (sortBy) {
    case "lastModifiedAt":
      return new Date(application.lastModifiedAt).getTime();
    case "createdAt":
      return new Date(application.createdAt).getTime();
    case "title":
      return application.title;
    case "status.value":
      return application.status.value;
    case "submittedAt":
      // An application that was never submitted sorts as epoch 0, so `desc` puts
      // submitted ones first — which is the useful ordering for a reviewer.
      return dateTime(application.submittedAt) ?? 0;
    default:
      // "custom" (application-defined field) - no built-in ordering to apply.
      return 0;
  }
}

/** The value an array filter matches against, per filter field name. */
function arrayFilterValue(
  application: Application,
  field: (typeof ARRAY_FILTER_FIELDS)[number],
): string {
  return field === "status"
    ? application.status.value
    : application.competitionId;
}

/** Resolves an `appId` path segment to a record, or the response to return. */
type AppLookup =
  | { ok: true; application: Application }
  | { ok: false; response: Response };

/** Validates and resolves an `appId`, so every route answers it identically. */
function lookupApplication(appId: string): AppLookup {
  if (!isUuid(appId)) {
    return {
      ok: false,
      response: errorResponse(400, "Invalid application id", [
        { field: "appId", message: "Must be a valid UUID" },
      ]),
    };
  }

  const application = getApplicationById(appId);
  if (!application) {
    return {
      ok: false,
      response: errorResponse(404, "Application not found", [
        {
          field: "appId",
          message: `No application found with id ${appId}`,
        },
      ]),
    };
  }

  return { ok: true, application };
}

/**
 * The request field carrying an application's title, for a given version.
 *
 * `@renamedFrom(Versions.v0_4, "name")` means the field was *called* `name` up
 * to and including v0.3 and is called `title` from v0.4 on.
 */
function titleFieldFor(version: Version): "name" | "title" {
  return isAtLeastVersion(version, "0.4.0") ? "title" : "name";
}

/**
 * `POST /v{version}/common-grants/applications/start` — begin an application.
 *
 * Answers 201 with the `Models.ApplicationBase` the write would have created:
 * the caller's title, the competition they named, and that competition's own
 * `opportunityId`, with an empty `formResponses` map and `inProgress` status.
 * Nothing is retained — see the module docstring.
 *
 * @param request - Carries `competitionId`, the version's title field, and an
 * optional `organizationId`.
 * @param version - Protocol version; decides which title field is expected.
 */
export async function startApplication(
  request: Request,
  version: Version,
): Promise<Response> {
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.body;

  const errors: FieldError[] = [];
  const titleField = titleFieldFor(version);
  const rawTitle = body[titleField];
  if (typeof rawTitle !== "string" || rawTitle.trim() === "") {
    errors.push({
      field: titleField,
      message: `Must be a non-empty string; v${version} names this field \`${titleField}\``,
    });
  }

  const rawCompetitionId = body.competitionId;
  if (typeof rawCompetitionId !== "string") {
    errors.push({
      field: "competitionId",
      message: "Must be a valid UUID",
    });
  } else if (!isUuid(rawCompetitionId)) {
    errors.push({ field: "competitionId", message: "Must be a valid UUID" });
  }

  const rawOrganizationId = body.organizationId;
  if (rawOrganizationId !== undefined) {
    if (typeof rawOrganizationId !== "string" || !isUuid(rawOrganizationId)) {
      errors.push({
        field: "organizationId",
        message: "Must be a valid UUID when provided",
      });
    }
  }

  if (errors.length > 0) {
    return errorResponse(400, "Invalid application request", errors);
  }

  const competitionId = rawCompetitionId as string;
  const competition = getCompetitionById(competitionId);
  if (!competition) {
    return errorResponse(404, "Competition not found", [
      {
        field: "competitionId",
        message: `No competition found with id ${competitionId}`,
      },
    ]);
  }

  return createdResponse({
    id: DRAFT_APPLICATION_ID,
    title: rawTitle as string,
    competitionId: competition.id,
    opportunityId: competition.opportunityId,
    formResponses: {},
    status: {
      value: "inProgress",
      description: "The application is in progress.",
    },
    submittedAt: null,
    createdAt: ECHOED_AT,
    lastModifiedAt: ECHOED_AT,
  });
}

/**
 * `GET /v{version}/common-grants/applications/{appId}` — a single application,
 * with its form responses and validation errors.
 *
 * @param appId - The path segment as received.
 * @param version - Protocol version; application models are unshaped across
 * v0.2–v0.4, so this is taken only to keep one signature across handlers.
 */
export function getApplication(appId: string, version: Version): Response {
  void version;
  const lookup = lookupApplication(appId);
  if (!lookup.ok) {
    return lookup.response;
  }

  return successResponse({ data: lookup.application });
}

/**
 * `PUT /v{version}/common-grants/applications/{appId}/submit` — submit for
 * review.
 *
 * The spec gives this route two outcomes: 200, or
 * `Responses.ApplicationSubmissionError` (a 400) when validation errors block
 * submission. Which one a fixture gets is decided by its own
 * `validationErrors`, so both branches are reachable from the playground —
 * `BLOCKED_APPLICATION_ID` exists to make the error branch demonstrable.
 *
 * **Host caveat.** This is the mock's only non-GET route with no request body,
 * which puts it on the wrong side of Astro's CSRF guard: `security.checkOrigin` (on
 * deliberately, see `astro.config.mjs`) answers 403 to a non-GET request that
 * carries no `Origin` *and* no `Content-Type`. Same-origin "Try it out" sends
 * `Origin` and passes; a copied `curl` sends neither and gets a bare 403
 * instead of the envelope below. Adding `-H 'Content-Type: application/json'`
 * to the curl is enough to clear the guard. This extends the 403-vs-404
 * divergence already accepted in #1078-T6 to one route that the mock now
 * actually serves.
 *
 * @param appId - The path segment as received.
 * @param version - Protocol version (unused; see `getApplication`).
 */
export async function submitApplication(
  appId: string,
  version: Version,
): Promise<Response> {
  void version;
  const lookup = lookupApplication(appId);
  if (!lookup.ok) {
    return lookup.response;
  }
  const { application } = lookup;

  const blocking = application.validationErrors ?? [];
  if (blocking.length > 0) {
    return errorResponse(
      400,
      "Application has validation errors and cannot be submitted",
      blocking,
    );
  }

  return successResponse({
    data: {
      ...application,
      status: {
        value: "submitted",
        description: "The application has been submitted.",
      },
      submittedAt: ECHOED_AT,
      lastModifiedAt: ECHOED_AT,
    },
  });
}

/**
 * Reads the search request from either the query string or the JSON body.
 *
 * The spec publishes `filters` and `sorting` as required query params on this
 * route while every sibling search takes a body; the mock accepts both (see the
 * module docstring). Query params win when both are present, since they are what
 * the published operation defines.
 *
 * A query param that isn't valid JSON is a 400 rather than a silent fallback to
 * the body: the caller clearly meant to filter, and quietly returning the
 * unfiltered set would be the worst possible answer.
 */
async function readSearchRequest(
  request: Request,
): Promise<
  { ok: true; body: SearchRequest } | { ok: false; response: Response }
> {
  const params = new URL(request.url).searchParams;
  const errors: FieldError[] = [];
  const fromQuery: SearchRequest = {};

  for (const field of ["filters", "sorting"] as const) {
    const raw = params.get(field);
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        errors.push({
          field,
          message: "Must be a JSON object when passed as a query parameter",
        });
        continue;
      }
      Object.assign(fromQuery, { [field]: parsed });
    } catch {
      errors.push({
        field,
        message: "Must be valid JSON when passed as a query parameter",
      });
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      response: errorResponse(400, "Invalid search request", errors),
    };
  }

  const search = params.get("search");
  if (search !== null) {
    fromQuery.search = search;
  }

  // A GET-shaped request (no body) with query params is complete on its own; a
  // body is read only when one was sent.
  const raw = await request.text();
  if (raw.trim() === "") {
    return { ok: true, body: fromQuery };
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

  return { ok: true, body: { ...(parsed as SearchRequest), ...fromQuery } };
}

/**
 * `POST /v{version}/common-grants/applications/search` — filtered, sorted,
 * paginated search.
 *
 * `@added(Versions.v0_3)`, unlike its v0.2 siblings, so v0.2 gets the same
 * protocol-shaped 404 a resource that doesn't exist yet gets. The gate lives
 * here rather than in the router because it is finer-grained than a resource:
 * the rest of `/applications` *is* served at v0.2.
 *
 * @param request - Carries the search as query params, a JSON body, or both.
 * @param version - Protocol version; below v0.3 this route does not exist.
 */
export async function searchApplications(
  request: Request,
  version: Version,
): Promise<Response> {
  if (!isAtLeastVersion(version, APPLICATION_SEARCH_MIN_VERSION)) {
    return errorResponse(404, "Not found", [
      {
        field: "path",
        message: `Application search was added in v${APPLICATION_SEARCH_MIN_VERSION} and is not served by v${version}`,
      },
    ]);
  }

  const parsed = await readSearchRequest(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.body;

  const errors: FieldError[] = [];
  const filters = body.filters ?? {};
  const sorting = body.sorting;

  validateSorting(sorting, VALID_SORT_BY, errors);

  validateArrayFilters(ARRAY_FILTER_FIELDS, filters, errors);

  const rangeFilter = filters.submittedAtRange;
  if (rangeFilter) {
    if (!VALID_RANGE_OPERATORS.has(rangeFilter.operator)) {
      errors.push({
        field: "filters.submittedAtRange.operator",
        message: `Unknown range operator: ${String(rangeFilter.operator)}`,
      });
    } else if (
      !rangeFilter.value ||
      typeof rangeFilter.value !== "object" ||
      (rangeFilter.value.min === undefined &&
        rangeFilter.value.max === undefined)
    ) {
      errors.push({
        field: "filters.submittedAtRange.value",
        message: "Must include at least one of min or max",
      });
    } else {
      for (const bound of ["min", "max"] as const) {
        const value = rangeFilter.value[bound];
        if (value === undefined) continue;
        if (dateTime(value) === undefined) {
          errors.push({
            field: `filters.submittedAtRange.value.${bound}`,
            message: `Must be a valid ISO 8601 date, received: ${JSON.stringify(value)}`,
          });
        }
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
  const { page, pageSize } = pagination.ok
    ? pagination
    : { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };

  if (errors.length > 0) {
    return errorResponse(400, "Invalid search request", errors);
  }

  let items = allApplications();

  if (body.search) {
    const q = body.search.toLowerCase();
    items = items.filter((application) =>
      application.title.toLowerCase().includes(q),
    );
  }
  for (const field of ARRAY_FILTER_FIELDS) {
    const filter = filters[field];
    if (!filter) continue;
    items = applyStringArrayFilter(items, filter, (application) =>
      arrayFilterValue(application, field),
    );
  }
  if (rangeFilter) {
    items = applyDateRangeFilter(items, rangeFilter, (application) =>
      dateTime(application.submittedAt),
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
    items = orderBy(items, (item) => sortKey(item, sortBy), sortOrder);
  }

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

/** Validates a `formId` and confirms the form exists, or returns the response. */
function lookupForm(
  formId: string,
): { ok: true } | { ok: false; response: Response } {
  if (!isUuid(formId)) {
    return {
      ok: false,
      response: errorResponse(400, "Invalid form id", [
        { field: "formId", message: "Must be a valid UUID" },
      ]),
    };
  }
  if (!getFormById(formId)) {
    return {
      ok: false,
      response: errorResponse(404, "Form not found", [
        { field: "formId", message: `No form found with id ${formId}` },
      ]),
    };
  }
  return { ok: true };
}

/**
 * `GET /v{version}/common-grants/applications/{appId}/forms/{formId}` — read one
 * form response.
 *
 * @param appId - The application the response belongs to.
 * @param formId - The form being responded to.
 * @param version - Protocol version (unused; see `getApplication`).
 */
export function readFormResponse(
  appId: string,
  formId: string,
  version: Version,
): Response {
  void version;
  const lookup = lookupApplication(appId);
  if (!lookup.ok) {
    return lookup.response;
  }

  const form = lookupForm(formId);
  if (!form.ok) {
    return form.response;
  }

  const response = getFormResponse(lookup.application, formId);
  if (!response) {
    return errorResponse(404, "Form response not found", [
      {
        field: "formId",
        message: `Application ${appId} has no response to form ${formId}`,
      },
    ]);
  }

  return successResponse({ data: response });
}

/**
 * `PUT /v{version}/common-grants/applications/{appId}/forms/{formId}` — set or
 * update a form response.
 *
 * Echoes the submitted body back inside a `Models.AppFormResponse` envelope.
 * The response is reported `complete` when the body has any fields and
 * `notStarted` when it is empty, which is the one piece of judgment the echo
 * makes — a caller who submits `{}` should not be told their form is done.
 *
 * @param appId - The application whose response is being written.
 * @param formId - The form being responded to.
 * @param request - Carries the response object as its JSON body.
 * @param version - Protocol version (unused; see `getApplication`).
 */
export async function writeFormResponse(
  appId: string,
  formId: string,
  request: Request,
  version: Version,
): Promise<Response> {
  void version;
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const lookup = lookupApplication(appId);
  if (!lookup.ok) {
    return lookup.response;
  }

  const form = lookupForm(formId);
  if (!form.ok) {
    return form.response;
  }

  const echoed: AppFormResponse = {
    applicationId: appId,
    id: ECHOED_FORM_RESPONSE_ID,
    formId,
    response: parsed.body,
    status:
      Object.keys(parsed.body).length === 0
        ? { value: "notStarted", description: "The form has not been started" }
        : { value: "complete", description: "The form response is complete" },
    createdAt: ECHOED_AT,
    lastModifiedAt: ECHOED_AT,
  };

  return successResponse({ data: echoed });
}
