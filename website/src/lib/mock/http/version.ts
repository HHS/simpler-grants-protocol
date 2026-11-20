/**
 * Resolves the `CG-Version` request header to the protocol version a route is
 * served in, per ADR 0032. Pure: the router supplies the header value and the
 * route's versions, and turns a returned error into a response with
 * `versionErrorResponse` (`./envelope.ts`).
 */

import { hostedVersionFor, type Version } from "../data/fixtures";

export const VERSION_HEADER = "CG-Version" as const;
export const VERSION_SERVED_HEADER = "CG-Version-Served";

/** Every route's default today; the router passes it as `RouteVersions.defaultVersion`. */
export const DEFAULT_VERSION: Version = "0.6.0";

/** The versions one route serves, as version errors report them. */
export interface RouteVersions {
  /** Request method and path, e.g. `GET /common-grants/awards`. */
  label: string;
  versions: readonly Version[];
  defaultVersion: Version;
}

/** Fields every version error carries, describing the route called. */
interface VersionErrorBase {
  field: typeof VERSION_HEADER;
  message: string;
  supported: Version[];
  defaultVersion: Version;
}

/** One `errors[]` entry of a 0.6.0 version error, minus `discovery`. */
export type VersionErrorDetail = VersionErrorBase &
  (
    | { code: "version.conflict" }
    | { code: "version.malformed"; requested: string }
    | {
        code: "version.unsupported";
        requested: string;
        scope: "deployment" | "operation";
      }
  );

/** A version error ready to render: status, envelope message, and detail. */
export interface VersionError {
  status: 400 | 406;
  message: string;
  detail: VersionErrorDetail;
}

export type VersionResolution = { version: Version } | { error: VersionError };

/** `protocolVersion`'s pattern from the 0.6.0 schemas: no `v`, no leading zeros. */
const PROTOCOL_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Resolves a raw `CG-Version` value (`null` when absent) for one route.
 * Checks, in order: more than one value, format, whether the server serves the
 * major.minor, whether this route does.
 */
export function resolveRequestedVersion(
  headerValue: string | null,
  route: RouteVersions,
): VersionResolution {
  if (headerValue === null) return { version: route.defaultVersion };

  const routeFields = {
    field: VERSION_HEADER,
    supported: [...route.versions],
    defaultVersion: route.defaultVersion,
  };
  const supportedText = route.versions.join(", ");

  // Fetch `Headers` joins a repeated header with ", ", so a comma means two values.
  if (headerValue.includes(",")) {
    // Quoted so an empty value (`"0.5.0, "`) still reads in the message.
    const values = headerValue
      .split(",")
      .map((value) => JSON.stringify(value.trim()));
    return {
      error: {
        status: 400,
        message: "The request sent more than one CG-Version value",
        detail: {
          ...routeFields,
          code: "version.conflict",
          message: `Received CG-Version values ${values.join(" and ")}`,
        },
      },
    };
  }

  const trimmed = headerValue.trim();
  if (!PROTOCOL_VERSION.test(trimmed)) {
    return {
      error: {
        status: 400,
        message: "The CG-Version header is not a valid CommonGrants version",
        detail: {
          ...routeFields,
          code: "version.malformed",
          message: `Version ${headerValue} is not a full MAJOR.MINOR.PATCH version`,
          requested: headerValue,
        },
      },
    };
  }

  const hosted = hostedVersionFor(trimmed);
  if (hosted !== undefined && route.versions.includes(hosted)) {
    return { version: hosted };
  }

  const scope = hosted === undefined ? "deployment" : "operation";
  const servedBy = scope === "deployment" ? "this server" : route.label;
  return {
    error: {
      status: 406,
      message:
        scope === "deployment"
          ? "The requested CommonGrants version is not available on this server"
          : "The requested CommonGrants version is not available for this route",
      detail: {
        ...routeFields,
        code: "version.unsupported",
        message: `Version ${trimmed} is not served by ${servedBy}. Supported versions: ${supportedText}`,
        requested: trimmed,
        scope,
      },
    },
  };
}

/** Adds `Vary: CG-Version`, since the response depends on the request header. */
export function withVaryVersion(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.append("Vary", VERSION_HEADER);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Adds `CG-Version-Served` and `Vary: CG-Version` to a response served in `version`. */
export function withVersionHeaders(
  response: Response,
  version: Version,
): Response {
  const varied = withVaryVersion(response);
  varied.headers.set(VERSION_SERVED_HEADER, version);
  return varied;
}
