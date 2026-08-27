/**
 * Which protocol version each resource first appears in (#334).
 *
 * The mock serves one path prefix per version, so a request for a resource that
 * did not exist yet in that version has to answer *something*. It answers a
 * protocol-shaped 404, which is the honest reply: on a real v0.2 API the awards
 * path genuinely is not a route. Getting that wrong in the other direction is
 * worse than a 404 — serving `GET /v0.2.0/common-grants/awards` would have the
 * playground demonstrate a route the v0.2 spec doesn't contain, and a visitor
 * comparing the mock against the version selector would find them disagreeing.
 *
 * Values come from the `@added(Versions.vX_Y)` decorators on the operations in
 * `lib/core/lib/api.tsp` — the instantiated API surface, not the reusable route
 * interfaces in `core/routes/`, which is the distinction that matters for
 * competitions: `Routes.Competitions` declares both `read` and `apply`, but
 * `api.tsp` instantiates only `read`, so only `read` is a real endpoint.
 *
 * `__tests__/lib/mock/conformance/fixtures-vs-schemas.spec.ts` cross-checks
 * every entry against the generated per-version schema directories: a resource
 * claimed available at a version whose schema set has no model for it, or the
 * reverse, fails there. So this table is asserted against the spec's own
 * output rather than trusted as a transcription.
 */

import { SUPPORTED_VERSIONS, type Version } from "./fixtures";

/** The resource families the mock serves, as named by their route segment. */
export type ResourceName =
  | "opportunities"
  | "competitions"
  | "applications"
  | "forms"
  | "awards"
  | "orgs";

/**
 * First version in which each resource's routes exist, per `api.tsp`.
 *
 * `applications` is the one family whose operations don't all arrive together:
 * `searchApplications` is `@added(Versions.v0_3)` while the rest are
 * `@added(Versions.v0_2)`, so the applications handler carries its own extra
 * gate for that one route (`APPLICATION_SEARCH_MIN_VERSION`).
 */
export const RESOURCE_MIN_VERSION: Record<ResourceName, Version> = {
  opportunities: "0.1.0",
  competitions: "0.2.0",
  applications: "0.2.0",
  forms: "0.2.0",
  awards: "0.4.0",
  orgs: "0.4.0",
};

/** `POST /applications/search` is `@added(Versions.v0_3)`, unlike its siblings. */
export const APPLICATION_SEARCH_MIN_VERSION: Version = "0.3.0";

/**
 * Compares two supported versions by their position in `SUPPORTED_VERSIONS`.
 *
 * Ordinal comparison rather than semver parsing: `SUPPORTED_VERSIONS` is the
 * ordered list of versions the docs publish, both arguments are already
 * narrowed to it, and adding a version means adding it there — so the index is
 * the authority on "which came first" and there is no second ordering to keep
 * in sync.
 */
function versionIndex(version: Version): number {
  return SUPPORTED_VERSIONS.indexOf(version);
}

/**
 * Whether a resource's routes exist in a given protocol version.
 *
 * @param resource - Route-segment name of the resource.
 * @param version - The version prefix the request arrived under.
 * @returns True when the version is at or after the resource's first version.
 */
export function isResourceAvailable(
  resource: ResourceName,
  version: Version,
): boolean {
  return versionIndex(version) >= versionIndex(RESOURCE_MIN_VERSION[resource]);
}

/** Whether `version` is at or after `minVersion`. */
export function isAtLeastVersion(
  version: Version,
  minVersion: Version,
): boolean {
  return versionIndex(version) >= versionIndex(minVersion);
}

/** Every supported version in which `resource` is served. */
export function versionsServing(resource: ResourceName): Version[] {
  return SUPPORTED_VERSIONS.filter((version) =>
    isResourceAvailable(resource, version),
  );
}
