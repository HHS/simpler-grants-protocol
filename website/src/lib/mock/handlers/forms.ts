/**
 * Fixture-backed handlers for the two form endpoints (`list` and `read`).
 * Forms are served whole, `jsonSchema`/`uiSchema` included, so a copied form
 * renders with the docs site's own form renderer.
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
 * newest-modified first per the operation's `@doc`.
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
 * `GET /v{version}/common-grants/forms/{formId}` — a single form. A malformed
 * id answers 400, not a route miss.
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
