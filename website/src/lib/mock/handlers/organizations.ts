/**
 * Fixture-backed handlers for the six organization endpoints.
 *
 * Auth is documented but not enforced, so the spec's 401/403 branches are
 * unreachable here. Writes are validate-and-echo and stateless: the merge
 * patch is applied to a copy, nothing is retained, and fixed timestamps plus a
 * reserved revision id keep responses deterministic.
 */

import type { Version } from "../data/fixtures";
import {
  allOrganizations,
  getOrganizationById,
  getRevision,
  revisionsForOrg,
  shapeRevision,
  type Identifier,
  type Organization,
  type OrgRevision,
  type WireOrgRevision,
} from "../data/organizations";
import {
  acceptedResponse,
  errorResponse,
  successResponse,
  type FieldError,
} from "../http/envelope";
import {
  isUuid,
  orderBy,
  pageOf,
  paginationInfo,
  readJsonObjectBody,
  resolveQueryPagination,
} from "../http/query";

/**
 * The reserved revision id every write echoes back. Absent from the fixtures,
 * so a follow-up `GET /orgs/{orgId}/changes/{this id}` answers 404.
 */
export const ECHOED_REVISION_ID = "4e5f6071-8293-44a5-8e1f-2031425364a5";

/** Fixed timestamp on echoed revisions — a wall-clock value would break determinism. */
const ECHOED_REVISION_AT = "2026-06-22T00:00:00Z";

/**
 * Finds the identifier a registry code names, checking `Models.OrgIds` keys
 * and `otherIds`. An unrecognized code simply matches nothing.
 */
function identifierFor(
  org: Organization,
  registry: string,
): Identifier | undefined {
  const identifiers = org.identifiers;
  if (!identifiers) return undefined;

  const direct = (identifiers as Record<string, unknown>)[registry];
  if (direct !== undefined && registry !== "otherIds") {
    return direct as Identifier;
  }
  return identifiers.otherIds?.[registry];
}

/**
 * Applies a JSON Merge Patch (RFC 7396) to a copy of `target`: `null` deletes
 * a member, nested objects merge key by key, arrays are replaced wholesale.
 */
function applyMergePatch(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    const existing = result[key];
    const bothPlainObjects = isPlainObject(value) && isPlainObject(existing);
    result[key] = bothPlainObjects
      ? applyMergePatch(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        )
      : value;
  }

  return result;
}

/** True for a non-null, non-array object — the only thing merge-patch merges. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Resolves an `orgId` path segment to a record, or the response to return. */
type OrgLookup =
  | { ok: true; org: Organization }
  | { ok: false; response: Response };

/** Validates and resolves an `orgId`, so all six handlers answer identically. */
function lookupOrg(orgId: string): OrgLookup {
  if (!isUuid(orgId)) {
    return {
      ok: false,
      response: errorResponse(400, "Invalid organization id", [
        { field: "orgId", message: "Must be a valid UUID" },
      ]),
    };
  }

  const org = getOrganizationById(orgId);
  if (!org) {
    return {
      ok: false,
      response: errorResponse(404, "Organization not found", [
        {
          field: "orgId",
          message: `No organization found with id ${orgId}`,
        },
      ]),
    };
  }

  return { ok: true, org };
}

/**
 * `GET /v{version}/common-grants/orgs` — the paginated list, ordered by name
 * (`OrganizationBase` has no `lastModifiedAt`). `registry` + `id` filter by
 * external identifier as a pair; one without the other is a 400.
 */
export function listOrganizations(
  request: Request,
  version: Version,
): Response {
  void version;
  const url = new URL(request.url);
  const registry = url.searchParams.get("registry");
  const identifierId = url.searchParams.get("id");

  const errors: FieldError[] = [];
  if (registry !== null && identifierId === null) {
    errors.push({
      field: "id",
      message: "Must be provided together with registry",
    });
  }
  if (identifierId !== null && registry === null) {
    errors.push({
      field: "registry",
      message: "Must be provided together with id",
    });
  }
  if (errors.length > 0) {
    return errorResponse(400, "Invalid identifier lookup", errors);
  }

  const pagination = resolveQueryPagination(request);
  if (!pagination.ok) {
    return errorResponse(
      400,
      "Invalid pagination parameters",
      pagination.errors,
    );
  }
  const { page, pageSize } = pagination;

  let items = allOrganizations();
  if (registry !== null && identifierId !== null) {
    items = items.filter(
      (org) => identifierFor(org, registry)?.id === identifierId,
    );
  }

  const sorted = orderBy(items, (org) => org.name, "asc");

  return successResponse({
    items: pageOf(sorted, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, sorted.length),
  });
}

/**
 * `GET /v{version}/common-grants/orgs/{orgId}` — a single profile. `?at` is
 * accepted and validated but does not change the response — the fixtures hold
 * one current profile per org, not a history.
 */
export function getOrganization(
  orgId: string,
  request: Request,
  version: Version,
): Response {
  void version;
  const at = new URL(request.url).searchParams.get("at");
  if (at !== null && Number.isNaN(new Date(at).getTime())) {
    return errorResponse(400, "Invalid point-in-time parameter", [
      { field: "at", message: `Must be a valid ISO 8601 timestamp: ${at}` },
    ]);
  }

  const lookup = lookupOrg(orgId);
  if (!lookup.ok) {
    return lookup.response;
  }

  return successResponse({ data: lookup.org });
}

/** Reads and validates a merge-patch body shared by the two write routes. */
async function readPatchBody(
  request: Request,
): Promise<
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }
  return { ok: true, patch: parsed.body };
}

/**
 * Builds the revision a write echoes back: `accepted` for a direct `PATCH`,
 * `pending` for a submitted change.
 */
function echoedRevision(
  org: Organization,
  patch: Record<string, unknown>,
  status: OrgRevision["status"],
): WireOrgRevision {
  // A `pending` change has not been applied, so it has no snapshot to report.
  const snapshot =
    status.value === "accepted"
      ? (applyMergePatch(
          org as unknown as Record<string, unknown>,
          patch,
        ) as unknown as Organization)
      : undefined;

  return shapeRevision({
    id: ECHOED_REVISION_ID,
    orgId: org.id,
    status,
    source: "commongrants-mock",
    patch,
    ...(snapshot === undefined ? {} : { snapshot }),
    createdAt: ECHOED_REVISION_AT,
    lastModifiedAt: ECHOED_REVISION_AT,
  });
}

/**
 * `PATCH /v{version}/common-grants/orgs/{orgId}` — answers 200 with an
 * `accepted` revision whose `snapshot` is the fixture with the merge patch
 * applied. Nothing is retained.
 */
export async function updateOrganization(
  orgId: string,
  request: Request,
  version: Version,
): Promise<Response> {
  void version;
  const body = await readPatchBody(request);
  if (!body.ok) {
    return body.response;
  }

  const lookup = lookupOrg(orgId);
  if (!lookup.ok) {
    return lookup.response;
  }

  return successResponse({
    data: echoedRevision(lookup.org, body.patch, {
      value: "accepted",
      description: "The change was applied.",
    }),
  });
}

/**
 * `POST /v{version}/common-grants/orgs/{orgId}/changes` — answers 202 with a
 * `pending` revision and a `Location` header. Nothing is stored, so polling
 * that URL answers 404; the header's shape is still part of the contract.
 */
export async function submitOrgChange(
  orgId: string,
  request: Request,
  version: Version,
): Promise<Response> {
  void version;
  const body = await readPatchBody(request);
  if (!body.ok) {
    return body.response;
  }

  const lookup = lookupOrg(orgId);
  if (!lookup.ok) {
    return lookup.response;
  }

  const revision = echoedRevision(lookup.org, body.patch, {
    value: "pending",
    description: "The change is queued for review.",
  });

  // Built from the request URL so the header keeps the caller's origin and
  // version prefix.
  const location = new URL(request.url);
  location.search = "";
  location.pathname = `${location.pathname.replace(/\/$/, "")}/${ECHOED_REVISION_ID}`;

  return acceptedResponse(revision, location.toString());
}

/**
 * `GET /v{version}/common-grants/orgs/{orgId}/changes` — the fixture change
 * history, newest first. Echoed writes never appear here.
 */
export function listOrgChanges(
  orgId: string,
  request: Request,
  version: Version,
): Response {
  void version;
  const lookup = lookupOrg(orgId);
  if (!lookup.ok) {
    return lookup.response;
  }

  const pagination = resolveQueryPagination(request);
  if (!pagination.ok) {
    return errorResponse(
      400,
      "Invalid pagination parameters",
      pagination.errors,
    );
  }
  const { page, pageSize } = pagination;

  // `revisionsForOrg` already returns newest-first, as the `@doc` promises.
  const revisions = revisionsForOrg(lookup.org.id).map(shapeRevision);

  return successResponse({
    items: pageOf(revisions, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, revisions.length),
  });
}

/**
 * `GET /v{version}/common-grants/orgs/{orgId}/changes/{changeId}` — one
 * change, scoped to the org: a change id that belongs to a different
 * organization answers 404.
 */
export function getOrgChange(
  orgId: string,
  changeId: string,
  version: Version,
): Response {
  void version;
  const lookup = lookupOrg(orgId);
  if (!lookup.ok) {
    return lookup.response;
  }

  if (!isUuid(changeId)) {
    return errorResponse(400, "Invalid change id", [
      { field: "changeId", message: "Must be a valid UUID" },
    ]);
  }

  const revision = getRevision(lookup.org.id, changeId);
  if (!revision) {
    return errorResponse(404, "Change not found", [
      {
        field: "changeId",
        message: `No change found with id ${changeId} for organization ${orgId}`,
      },
    ]);
  }

  return successResponse({ data: shapeRevision(revision) });
}
