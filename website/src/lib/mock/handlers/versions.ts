/**
 * Handler for `GET /common-grants/versions`, the ADR 0032 discovery route. It
 * sits outside version selection, so it never reads `CG-Version`.
 */

import {
  APPLICATION_SEARCH_MIN_VERSION,
  versionsFrom,
  versionsServing,
  type ResourceName,
} from "../data/availability";
import { SUPPORTED_VERSIONS, type Version } from "../data/fixtures";
import { successResponse } from "../http/envelope";
import { DEFAULT_VERSION } from "../http/version";

/** The discovery route's published path, below the mount point. */
export const VERSIONS_PATH = "/common-grants/versions";

/** The absolute discovery URL that version errors point to. */
export function discoveryUrl(origin: string, basePath: string): string {
  return `${origin}${basePath}${VERSIONS_PATH}`;
}

/**
 * Every route added after 0.1.0, keyed as discovery publishes it, mapped to
 * the resource whose availability governs it. The opportunity routes serve
 * the whole baseline, so they have no entry.
 */
const ROUTES_BY_RESOURCE: Record<
  Exclude<ResourceName, "opportunities">,
  string[]
> = {
  applications: [
    "GET /common-grants/applications/{appId}",
    "GET /common-grants/applications/{appId}/forms/{formId}",
    "PUT /common-grants/applications/{appId}/forms/{formId}",
    "POST /common-grants/applications/start",
    "PUT /common-grants/applications/{appId}/submit",
  ],
  competitions: ["GET /common-grants/competitions/{compId}"],
  forms: ["GET /common-grants/forms", "GET /common-grants/forms/{formId}"],
  awards: [
    "GET /common-grants/awards",
    "GET /common-grants/awards/{awdId}",
    "POST /common-grants/awards/search",
  ],
  orgs: [
    "GET /common-grants/orgs",
    "GET /common-grants/orgs/{orgId}",
    "PATCH /common-grants/orgs/{orgId}",
    "GET /common-grants/orgs/{orgId}/changes",
    "POST /common-grants/orgs/{orgId}/changes",
    "GET /common-grants/orgs/{orgId}/changes/{changeId}",
  ],
};

interface OperationVersions {
  versions: Version[];
  defaultVersion: Version;
}

function operations(): Record<string, OperationVersions> {
  const entries: Record<string, OperationVersions> = {};
  for (const [resource, routes] of Object.entries(ROUTES_BY_RESOURCE)) {
    const versions = versionsServing(resource as ResourceName);
    for (const key of routes) {
      entries[key] = { versions, defaultVersion: DEFAULT_VERSION };
    }
  }
  entries["POST /common-grants/applications/search"] = {
    versions: versionsFrom(APPLICATION_SEARCH_MIN_VERSION),
    defaultVersion: DEFAULT_VERSION,
  };
  return entries;
}

/** `GET /common-grants/versions`: the baseline plus each route that differs. */
export function getVersionDiscovery(): Response {
  return successResponse({
    data: {
      versions: [...SUPPORTED_VERSIONS],
      defaultVersion: DEFAULT_VERSION,
      operations: operations(),
    },
  });
}
