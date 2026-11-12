import "@typespec/http";
import "@typespec/versioning";
import "./types.tsp";

/** Version negotiation headers (ADR 0032), added in protocol version 0.6.0
 *
 * @example How to add the version request header to a custom route
 *
 * ```typespec
 * import "@typespec/http";
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Headers namespace
 * using TypeSpec.Http;
 * using TypeSpec.Versioning;
 *
 * @service
 * @useDependency(CommonGrants.Versions.v0_6)
 * namespace MyApi;
 *
 * @route("/common-grants/custom")
 * @get
 * op listCustom(...Headers.VersionRequest): Responses.OkT<string>;
 * ```
 */
namespace CommonGrants.Headers;

/** Request headers a client sends to select a protocol version */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionRequest {
  /** The protocol version the client wants, such as `0.5.0`
   *
   * Servers match on major and minor version. When absent, the server responds
   * in its default version.
   */
  @Http.header("CG-Version")
  // Spreading drops model-level `@added`, so each property repeats it
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersion?: Types.protocolVersion;
}

/** Response headers that report the protocol version a response was served in */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionResponse {
  /** The full protocol version this response was served in, such as `0.5.1`
   *
   * Can differ from the requested version in the patch number only.
   */
  @Http.header("CG-Version-Served")
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersionServed: Types.protocolVersion;

  ...VersionLifecycle;
}

/** Version headers for 401 and 403 responses */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionResponseAuth {
  /** The full protocol version this response was served in, such as `0.5.1`
   *
   * Optional because authentication can run before a version is selected.
   */
  @Http.header("CG-Version-Served")
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersionServed?: Types.protocolVersion;

  ...VersionLifecycle;
}

/** Caching and retirement headers shared by `VersionResponse` and `VersionResponseAuth` */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionLifecycle {
  /** Request headers that caches must key this response on, such as `CG-Version` */
  @Http.header("Vary")
  @Versioning.added(CommonGrants.Versions.v0_6)
  vary?: string;

  /** When the served version was or will be deprecated (RFC 9745), such as `@1796083200` */
  @pattern("^@-?[0-9]+$")
  @Http.header("Deprecation")
  @Versioning.added(CommonGrants.Versions.v0_6)
  deprecation?: string;

  /** When the served version stops responding (RFC 8594), such as `Tue, 01 Jun 2027 00:00:00 GMT` */
  @encode(DateTimeKnownEncoding.rfc7231)
  @Http.header("Sunset")
  @Versioning.added(CommonGrants.Versions.v0_6)
  sunset?: utcDateTime;

  /** Links about the served version's lifecycle (RFC 8288), such as `rel="sunset"` */
  @Http.header("Link")
  @Versioning.added(CommonGrants.Versions.v0_6)
  link?: string;
}
