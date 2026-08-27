/**
 * Deterministic, fixture-backed handlers for the two form endpoints (#3C-2-T1).
 *
 * The smallest resource in the mock: `Routes.Forms` declares only `list` and
 * `read`, both `@added(Versions.v0_2)`, and neither takes a filter or a sort
 * parameter. So there is no search handler here and no `Models.FormSortBy` to
 * validate against — the list is ordered `lastModifiedAt` descending, which is
 * what the operation's own `@doc` promises ("sorted by `lastModifiedAt` with
 * most recent first").
 *
 * Forms are served whole. `Models.FormBase` carries the `jsonSchema` /
 * `uiSchema` pair the docs site's own form renderer consumes
 * (`src/lib/forms/`), so a visitor can copy a form out of the playground and
 * render it — which is only true if the mock returns the pair rather than a
 * trimmed preview of it.
 */

import { allForms, getFormById } from "../data/forms";
import type { Version } from "../data/fixtures";
import { errorResponse, successResponse } from "../http/envelope";
import {
  isUuid,
  orderBy,
  pageOf,
  paginationInfo,
  resolveQueryPagination,
} from "../http/query";

/**
 * `GET /v{version}/common-grants/forms` — the paginated list, ordered
 * newest-modified first.
 *
 * @param request - Carries the `page`/`pageSize` query params.
 * @param version - Protocol version; forms are unshaped across v0.2–v0.4, so
 * this is taken only to keep one signature across all list handlers.
 */
export function listForms(request: Request, version: Version): Response {
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
    allForms(),
    (form) => new Date(form.lastModifiedAt).getTime(),
    "desc",
  );

  return successResponse({
    items: pageOf(sorted, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, sorted.length),
  });
}

/**
 * `GET /v{version}/common-grants/forms/{formId}` — a single form.
 *
 * @param formId - The path segment as received; validated as UUID-shaped here
 * rather than in the router, so a malformed id answers 400 (not a route miss).
 * @param version - Protocol version (unused; see `listForms`).
 */
export function getForm(formId: string, version: Version): Response {
  void version;
  if (!isUuid(formId)) {
    return errorResponse(400, "Invalid form id", [
      { field: "formId", message: "Must be a valid UUID" },
    ]);
  }

  const form = getFormById(formId);
  if (!form) {
    return errorResponse(404, "Form not found", [
      { field: "formId", message: `No form found with id ${formId}` },
    ]);
  }

  return successResponse({ data: form });
}
