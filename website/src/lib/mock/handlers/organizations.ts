/**
 * Deterministic, fixture-backed handlers for the six organization endpoints
 * (#3C-2-T1).
 *
 * Organizations are the mock's most complex resource: two reads, two writes,
 * and two more reads over a sub-resource (`/changes`). They are also the only
 * routes the spec puts behind OAuth scopes (`org:read`, `org:write`,
 * `org.changes:read`, `org.changes:write`).
 *
 * **Auth is documented, not enforced.** The mock accepts every request
 * regardless of `Authorization`. That is deliberate and it is the honest choice
 * for a playground: enforcing scopes would require issuing tokens, which turns
 * a one-click "Try it out" into a login flow and puts a credential prompt on a
 * public docs page for data that is entirely synthetic. `http/cors.ts` already
 * allows the `Authorization` and `X-API-Key` headers through so an SDK
 * configured with auth still works — its token is simply ignored. The
 * consequence to be aware of: this mock cannot demonstrate a 401 or 403, so the
 * `Responses.Unauthorized` / `Forbidden` branches the spec declares on these
 * operations are unreachable here. Recorded rather than papered over.
 *
 * **Writes are validate-and-echo, and stateless.** `PATCH /orgs/{orgId}` and
 * `POST /orgs/{orgId}/changes` validate the merge patch, apply it to a *copy* of
 * the fixture, and return the resulting revision. Nothing is retained: a
 * subsequent `GET /orgs/{orgId}` returns the unmodified fixture, and the change
 * does not appear in `GET /orgs/{orgId}/changes`. The alternative — a
 * module-level store — was rejected because responses would then depend on call
 * order, which breaks the determinism every fixture-backed suite here relies on,
 * and because a Worker isolate is not guaranteed to survive between requests, so
 * the "state" would be real in tests and imaginary in production.
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
 * The revision id every write echoes back.
 *
 * A stateless write cannot mint a durable id, and it must not mint a random one
 * either — a body that differed per call would break the deterministic-response
 * guarantee. So both write routes report this single reserved id. It is absent
 * from `ORG_REVISION_FIXTURES`, so a follow-up
 * `GET /orgs/{orgId}/changes/{this id}` answers 404: the honest reply from a
 * mock that echoed a change rather than recording one.
 */
export const ECHOED_REVISION_ID = "4e5f6071-8293-44a5-8e1f-2031425364a5";

/**
 * The timestamp stamped on an echoed revision.
 *
 * Fixed rather than `new Date()`: a wall-clock value would make every response
 * differ, which is exactly what the golden-envelope corpus and the determinism
 * assertions exist to rule out. It is the same instant the newest fixture
 * revision carries, so an echoed change reads as "the most recent change" beside
 * the real history.
 */
const ECHOED_REVISION_AT = "2026-06-22T00:00:00Z";

/**
 * Registry codes a caller may filter `GET /orgs` by.
 *
 * The list operation takes a `registry` + `id` pair for external-identifier
 * lookup (`?registry=org:us:ein&id=123456789`). Codes are matched against the
 * keys of `Models.OrgIds` plus anything under `otherIds`, so this is not a
 * closed set — an unrecognized code simply matches nothing.
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
 * Applies a JSON Merge Patch (RFC 7396) to a copy of `target`.
 *
 * Implemented rather than echoed straight back, because the merge-patch
 * semantics are the interesting part of `PATCH /orgs/{orgId}` and a caller
 * cannot see them in an echo: a `null` value *deletes* a member rather than
 * setting it to null, and a nested object merges key by key instead of
 * replacing the whole subtree. Arrays are replaced wholesale, per the RFC.
 *
 * @param target - The record to patch; never mutated.
 * @param patch - The merge patch as received.
 * @returns A new object with the patch applied.
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

/**
 * Validates and resolves an `orgId`, so all six handlers answer a malformed id
 * and an unknown id identically.
 */
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
 * `GET /v{version}/common-grants/orgs` — the paginated list, ordered by name.
 *
 * Ordered by `name` ascending rather than `lastModifiedAt`: unlike every other
 * list operation in the spec, this one's `@doc` promises no ordering, and
 * `Models.OrganizationBase` has no `lastModifiedAt` to sort on — it is the one
 * resource model that does not spread `SystemMetadata`. Alphabetical is the
 * ordering a reader of a directory expects, and it is total, so pages are
 * stable.
 *
 * Also serves the spec's external-identifier lookup: `registry` + `id` together
 * filter to organizations carrying that identifier. The two are only meaningful
 * as a pair, so one without the other is a 400 rather than a silently ignored
 * half-filter.
 *
 * @param request - Carries `page`/`pageSize` and the optional `registry`/`id`.
 * @param version - Protocol version; orgs exist only in v0.4.
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
 * `GET /v{version}/common-grants/orgs/{orgId}` — a single organization profile.
 *
 * `?at=<timestamp>` is accepted and validated but does not change the response:
 * the fixture set holds one current profile per organization, not a history to
 * read as-of. Accepting it matters anyway — the parameter is part of the
 * published operation, so rejecting it would make a documented request fail —
 * and validating it matters too, since silently ignoring a malformed timestamp
 * would let a caller believe they got a point-in-time read when they didn't.
 *
 * @param orgId - The path segment as received.
 * @param request - Carries the optional `at` query param.
 * @param version - Protocol version; orgs exist only in v0.4.
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
 * Builds the revision a write echoes back.
 *
 * @param org - The organization the change applies to.
 * @param patch - The merge patch as received.
 * @param status - `accepted` for a direct `PATCH`, `pending` for a submitted
 * change; the spec ties the two routes to those two states.
 */
function echoedRevision(
  org: Organization,
  patch: Record<string, unknown>,
  status: OrgRevision["status"],
): WireOrgRevision {
  // A `pending` change has not been applied, so it has no snapshot to report —
  // the protocol describes `snapshot` as the record "with the change applied".
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
 * `PATCH /v{version}/common-grants/orgs/{orgId}` — a direct, trusted edit.
 *
 * Answers 200 with an `accepted` `Models.OrgRevision` whose `snapshot` is the
 * fixture with the merge patch applied, so a caller can see what their patch
 * would have done — including a `null` member deletion — without the mock
 * retaining it.
 *
 * @param orgId - The path segment as received.
 * @param request - Carries the JSON Merge Patch body.
 * @param version - Protocol version; orgs exist only in v0.4.
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
 * `POST /v{version}/common-grants/orgs/{orgId}/changes` — submit a change for
 * review.
 *
 * Answers 202 with a `pending` revision and a `Location` header pointing at
 * `GET /orgs/{orgId}/changes/{changeId}`, which is the resource a submitter
 * would poll. The mock does not retain the change, so polling that URL answers
 * 404 — stated here because the `Location` header otherwise implies otherwise.
 * The header is still worth sending: its *shape* is part of the contract a
 * client implements against, and a client that builds its polling URL from it
 * is correct even though this particular mock has nothing to serve there.
 *
 * @param orgId - The path segment as received.
 * @param request - Carries the JSON Merge Patch body.
 * @param version - Protocol version; orgs exist only in v0.4.
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

  // Built from the request URL so the header carries the same origin and version
  // prefix the caller used, rather than a path the caller would have to rebase.
  const location = new URL(request.url);
  location.search = "";
  location.pathname = `${location.pathname.replace(/\/$/, "")}/${ECHOED_REVISION_ID}`;

  return acceptedResponse(revision, location.toString());
}

/**
 * `GET /v{version}/common-grants/orgs/{orgId}/changes` — the change history,
 * newest first.
 *
 * Serves `ORG_REVISION_FIXTURES` scoped to this organization. Changes submitted
 * through `submitOrgChange` never appear here (see the module docstring).
 *
 * @param orgId - The path segment as received.
 * @param request - Carries the `page`/`pageSize` query params.
 * @param version - Protocol version; orgs exist only in v0.4.
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

  // `revisionsForOrg` already returns newest-first, which is what the
  // operation's `@doc` promises.
  const revisions = revisionsForOrg(lookup.org.id).map(shapeRevision);

  return successResponse({
    items: pageOf(revisions, page, pageSize),
    paginationInfo: paginationInfo(page, pageSize, revisions.length),
  });
}

/**
 * `GET /v{version}/common-grants/orgs/{orgId}/changes/{changeId}` — one change.
 *
 * Scoped to the organization: a change id that exists but belongs to a different
 * organization answers 404, not 200. The routes nest for a reason, and a mock
 * that ignored the nesting would teach a client that the id is globally
 * addressable when the spec says it is addressable within an org.
 *
 * @param orgId - The path segment as received.
 * @param changeId - The change's id, validated the same way.
 * @param version - Protocol version; orgs exist only in v0.4.
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
