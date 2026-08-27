/**
 * Which protocol version each resource first appears in. Values come from the
 * `@added(...)` decorators in `lib/core/lib/api.tsp`, and the conformance spec
 * cross-checks them against the generated per-version schemas.
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
 * Application search alone is v0.3+ (`APPLICATION_SEARCH_MIN_VERSION`);
 * the other application routes are v0.2+.
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

/** Position in `SUPPORTED_VERSIONS` is the version ordering. */
function versionIndex(version: Version): number {
  return SUPPORTED_VERSIONS.indexOf(version);
}

/** Whether a resource's routes exist in a given protocol version. */
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
