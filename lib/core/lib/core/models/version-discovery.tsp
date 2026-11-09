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
}

// #########################################################
// OperationVersions
// #########################################################

/** The versions a single route serves, when they differ from the API-wide values */
@Versioning.added(CommonGrants.Versions.v0_6)
model OperationVersions {
  /** The versions this route serves */
  versions: Types.protocolVersion[];

  /** The version this route serves when a request doesn't name one */
  defaultVersion: Types.protocolVersion;

  /** A scheduled change to this route's default version, if any */
  upcomingDefault?: UpcomingDefault;

  /** Deprecated versions of this route, keyed by version, with their retirement schedule */
  deprecated?: Record<VersionRetirement>;
}

// #########################################################
// VersionDiscovery
// #########################################################

/** The protocol versions an API serves
 *
 * The top-level fields describe every route. Routes that differ from them
 * have an entry in `operations`. New fields are only ever added to this
 * model; clients ignore fields they don't recognize.
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
  /** The versions every route serves */
  versions: Types.protocolVersion[];

  /** The version every route serves when a request doesn't name one */
  defaultVersion: Types.protocolVersion;

  /** A scheduled change to the API-wide default version, if any */
  upcomingDefault?: UpcomingDefault;

  /** Deprecated versions, keyed by version, with their retirement schedule */
  deprecated?: Record<VersionRetirement>;

  /** Routes whose versions differ from the API-wide values
   *
   * Each key is the HTTP method and the route's published path, separated
   * by a space, such as `GET /common-grants/forms/{formId}`. Path parameter
   * names are ignored when matching a key to a route. Omitted when every
   * route serves the API-wide values.
   */
  operations?: Record<OperationVersions>;
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
