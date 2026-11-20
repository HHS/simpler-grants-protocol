import "../types.tsp";

namespace CommonGrants.Models;

// #########################################################
// UpcomingDefault
// #########################################################

/** A scheduled change to the version a server serves by default */
@Versioning.added(CommonGrants.Versions.v0_6)
model UpcomingDefault {
  /** The version that will become the default */
  version: Types.protocolVersion;

  /** When the new default takes effect */
  date: utcDateTime;

  // Discovery sits outside version selection, so new fields must be tolerated rather than versioned
  ...Record<unknown>;
}

// #########################################################
// VersionRetirement
// #########################################################

/** The retirement schedule for a deprecated version */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionRetirement {
  /** When the version was or will be deprecated */
  deprecation: utcDateTime;

  /** When the server will stop serving the version, if scheduled */
  sunset?: utcDateTime;

  ...Record<unknown>;
}

// #########################################################
// OperationVersions
// #########################################################

/** The versions a single route serves, when they differ from the API-wide values */
@Versioning.added(CommonGrants.Versions.v0_6)
model OperationVersions {
  /** The versions this route serves */
  @minItems(1)
  versions: Types.protocolVersion[];

  /** The version this route serves when a request doesn't name one, one of `versions` */
  defaultVersion: Types.protocolVersion;

  /** A scheduled change to this route's default version, if any. Its `version` is one of `versions` */
  upcomingDefault?: UpcomingDefault;

  /** Deprecated versions of this route, keyed by version, with their retirement schedule
   *
   * Each key is a version from `versions`, written exactly as it appears
   * there. A server hosting `0.3.1` lists `0.3.1` in `versions` and uses
   * `0.3.1` as the key here.
   *
   * To check whether the version you request is deprecated, compare only
   * the major and minor. A client requesting `0.3.0` is served `0.3.1`, so
   * its entry is under `0.3.1`.
   */
  @TypeSpec.JsonSchema.extension(
    "propertyNames",
    #{ $ref: "protocolVersion.yaml" }
  )
  deprecated?: Record<VersionRetirement>;

  ...Record<unknown>;
}

// #########################################################
// VersionDiscovery
// #########################################################

/** The protocol versions an API serves
 *
 * The top-level fields describe every route that has no entry in
 * `operations`. Routes that differ from them have an entry in `operations`.
 * New fields are only ever added to this model; clients ignore fields they
 * don't recognize.
 */
@example(
  Examples.VersionDiscovery.routeEntries,
  #{ title: "Baseline with route entries" }
)
@example(
  Examples.VersionDiscovery.lifecycle,
  #{ title: "Upcoming default and deprecated version" }
)
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionDiscovery {
  /** The versions every route without an `operations` entry serves */
  @minItems(1)
  versions: Types.protocolVersion[];

  /** The version every route without an `operations` entry serves when a request doesn't name one, one of `versions` */
  defaultVersion: Types.protocolVersion;

  /** A scheduled change to the API-wide default version, if any. Its `version` is one of `versions` */
  upcomingDefault?: UpcomingDefault;

  /** Deprecated versions, keyed by version, with their retirement schedule
   *
   * Each key is a version from `versions`, written exactly as it appears
   * there. A server hosting `0.3.1` lists `0.3.1` in `versions` and uses
   * `0.3.1` as the key here.
   *
   * To check whether the version you request is deprecated, compare only
   * the major and minor. A client requesting `0.3.0` is served `0.3.1`, so
   * its entry is under `0.3.1`.
   */
  @TypeSpec.JsonSchema.extension(
    "propertyNames",
    #{ $ref: "protocolVersion.yaml" }
  )
  deprecated?: Record<VersionRetirement>;

  /** Routes whose versions differ from the API-wide values
   *
   * Each key is the HTTP method and the route's published path, separated
   * by a space, such as `GET /common-grants/forms/{formId}`. Path parameter
   * names are ignored when matching a key to a route. Omitted when every
   * route serves the API-wide values.
   */
  operations?: Record<OperationVersions>;

  ...Record<unknown>;
}

// #########################################################
// Examples
// #########################################################

/** Examples of version discovery responses */
namespace Examples.VersionDiscovery {
  /** A 0.4.0 baseline with routes that serve other versions */
  const routeEntries = #{
    versions: #["0.4.0"],
    defaultVersion: "0.4.0",
    operations: #{
      `GET /common-grants/forms`: #{
        versions: #["0.5.0"],
        defaultVersion: "0.5.0",
      },
      `GET /common-grants/forms/{formId}`: #{
        versions: #["0.4.0", "0.5.0"],
        defaultVersion: "0.4.0",
      },
    },
  };

  /** A scheduled default change and a deprecated version */
  const lifecycle = #{
    versions: #["0.3.0", "0.4.0", "0.5.0"],
    defaultVersion: "0.4.0",
    upcomingDefault: #{
      version: "0.5.0",
      date: utcDateTime.fromISO("2027-03-01T00:00:00Z"),
    },
    deprecated: #{
      `0.3.0`: #{
        deprecation: utcDateTime.fromISO("2026-12-01T00:00:00Z"),
        sunset: utcDateTime.fromISO("2027-06-01T00:00:00Z"),
      },
    },
  };
}
