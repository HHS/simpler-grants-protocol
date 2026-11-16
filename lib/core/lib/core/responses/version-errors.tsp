import "@typespec/http";
import "../types.tsp";
import "./error.tsp";

namespace CommonGrants.Responses;

// ############################################################################
// Version error details
// ############################################################################

/** Whether a version is unavailable on the whole server or only on the route called */
@Versioning.added(CommonGrants.Versions.v0_6)
enum VersionErrorScope {
  /** The server doesn't serve the version on any route */
  deployment,

  /** The server serves the version, but not on this route */
  operation,
}

/** Details shared by every version error, describing the route that was called */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionErrorDetail {
  /** The request header the error is about */
  field: "CG-Version";

  /** Human-readable description of the problem */
  message: string;

  /** The versions this route serves */
  @minItems(1)
  supported: Types.protocolVersion[];

  /** The version this route serves when a request doesn't name one */
  defaultVersion: Types.protocolVersion;

  /** The server's version discovery URL
   *
   * Omitted by servers that serve one version and don't publish discovery.
   */
  discovery?: url;
}

/** The `CG-Version` value isn't a full `MAJOR.MINOR.PATCH` version */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionMalformedDetail extends VersionErrorDetail {
  /** Stable error code that clients branch on */
  code: "version.malformed";

  /** The value received, as sent */
  requested: string;

  // Version errors are returned outside version selection, so new fields must be tolerated
  ...Record<unknown>;
}

/** The request sent more than one `CG-Version` value */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionConflictDetail extends VersionErrorDetail {
  /** Stable error code that clients branch on */
  code: "version.conflict";

  ...Record<unknown>;
}

/** The requested version isn't served by this server or this route */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionUnsupportedDetail extends VersionErrorDetail {
  /** Stable error code that clients branch on */
  code: "version.unsupported";

  /** The version requested */
  requested: Types.protocolVersion;

  /** Whether the server or only this route doesn't serve the version */
  scope: VersionErrorScope;

  ...Record<unknown>;
}

/** The requested version was retired from this server or this route */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionRetiredDetail extends VersionErrorDetail {
  /** Stable error code that clients branch on */
  code: "version.retired";

  /** The version requested */
  requested: Types.protocolVersion;

  /** Whether the server or only this route doesn't serve the version */
  scope: VersionErrorScope;

  /** When the version stopped being served */
  sunset: utcDateTime;

  ...Record<unknown>;
}

// ############################################################################
// Version error responses
// ############################################################################

@example(#{
  status: 400,
  message: "The CG-Version header is not a valid CommonGrants version",
  errors: #[
    #{
      field: "CG-Version",
      code: "version.malformed",
      message: "Version 0.5 is not a full MAJOR.MINOR.PATCH version",
      requested: "0.5",
      supported: #["0.5.0", "0.6.0"],
      defaultVersion: "0.5.0",
      discovery: "https://grants.example.org/common-grants/versions",
    }
  ],
})
@error
@doc("A `CG-Version` header that isn't a full `MAJOR.MINOR.PATCH` version")
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionMalformedError extends Error {
  @example(400)
  status: 400;

  @minItems(1)
  errors: VersionMalformedDetail[];
}

@example(#{
  status: 400,
  message: "The request sent more than one CG-Version value",
  errors: #[
    #{
      field: "CG-Version",
      code: "version.conflict",
      message: "Received CG-Version values 0.5.0 and 0.6.0",
      supported: #["0.5.0", "0.6.0"],
      defaultVersion: "0.5.0",
      discovery: "https://grants.example.org/common-grants/versions",
    }
  ],
})
@error
@doc("A request that sent more than one `CG-Version` value, even the same value twice")
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionConflictError extends Error {
  @example(400)
  status: 400;

  @minItems(1)
  errors: VersionConflictDetail[];
}

@example(#{
  status: 406,
  message: "The requested CommonGrants version is not available for this route",
  errors: #[
    #{
      field: "CG-Version",
      code: "version.unsupported",
      message: "Version 0.4.0 is not served by GET /common-grants/forms. Supported versions: 0.5.0, 0.6.0",
      requested: "0.4.0",
      supported: #["0.5.0", "0.6.0"],
      scope: VersionErrorScope.operation,
      defaultVersion: "0.5.0",
      discovery: "https://grants.example.org/common-grants/versions",
    }
  ],
})
@error
@doc("A requested version that this server or route doesn't serve")
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionUnsupportedError extends Error {
  @example(406)
  status: 406;

  @minItems(1)
  errors: VersionUnsupportedDetail[];
}

@example(#{
  status: 406,
  message: "The requested CommonGrants version has been retired",
  errors: #[
    #{
      field: "CG-Version",
      code: "version.retired",
      message: "Version 0.3.0 was retired on 2027-06-01. Supported versions: 0.4.0, 0.5.0, 0.6.0",
      requested: "0.3.0",
      supported: #["0.4.0", "0.5.0", "0.6.0"],
      scope: VersionErrorScope.deployment,
      defaultVersion: "0.4.0",
      discovery: "https://grants.example.org/common-grants/versions",
      sunset: utcDateTime.fromISO("2027-06-01T00:00:00Z"),
    }
  ],
})
@error
@doc("A requested version that was retired from this server or route")
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionRetiredError extends Error {
  @example(406)
  status: 406;

  @minItems(1)
  errors: VersionRetiredDetail[];
}

// Status codes live on these aliases, not the models, so they stay out of the
// JSON Schemas. Version errors carry no version response headers (ADR 0032).
alias VersionMalformed = VersionMalformedError & Http.BadRequestResponse;
alias VersionConflict = VersionConflictError & Http.BadRequestResponse;
alias VersionUnsupported = VersionUnsupportedError & Http.Response<406>;
alias VersionRetired = VersionRetiredError & Http.Response<406>;

// Adds the version errors to a route's responses from protocol version 0.6.0.
// Docs go on the variants: a union-level doc would replace every response description.
union WithVersionErrors<R> {
  response: R,

  /** The `CG-Version` value is malformed or was sent more than once */
  @Versioning.added(CommonGrants.Versions.v0_6)
  badRequest: VersionMalformed | VersionConflict,

  /** The requested version isn't served by this server or this route */
  @Versioning.added(CommonGrants.Versions.v0_6)
  notAcceptable: VersionUnsupported | VersionRetired,
}
