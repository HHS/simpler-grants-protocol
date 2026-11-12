import "@typespec/http";
import "@typespec/versioning";
import "./types.tsp";

/** HTTP headers shared by every CommonGrants protocol route
 *
 * These models are spread into route parameters and response templates, so
 * they appear as headers in the OpenAPI document, never as fields in a JSON
 * Schema. They implement the
 * version negotiation headers from ADR 0032 and only appear in APIs that
 * depend on protocol version 0.6.0 or later.
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
   * A full published version. A `v` prefix, short forms such as `0.5`, ranges,
   * and aliases are malformed. Servers trim surrounding whitespace before
   * checking the value against this format, then match on major and minor
   * version, so a request for `0.5.0` can be served by a server hosting
   * `0.5.1`. Send one value per request. When the header is absent, the
   * server responds in its default version. Header names are case-insensitive.
   */
  @Http.header("CG-Version")
  // Spreading drops model-level `@added`, so each property repeats it
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersion?: Types.protocolVersion;
}

/** Response headers that report the protocol version a response was served in
 *
 * Spread into every success response template, intersected into the
 * `NotFound` error, and carried by the application submission error. Version
 * errors never carry these headers.
 */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionResponse {
  /** The full protocol version this response was served in, such as `0.5.1`
   *
   * Sent on every response produced after a version is selected, including
   * responses served in the server's default version and errors such as a
   * missing record or a body validation error. It can differ from the
   * requested version in the patch number only. A response without it is
   * unconfirmed and must not be read as the requested version.
   */
  @Http.header("CG-Version-Served")
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersionServed: Types.protocolVersion;

  ...VersionLifecycle;
}

/** Version headers for 401 and 403 responses
 *
 * `CG-Version-Served` is optional here, because authentication can run before
 * the server selects a version.
 */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionResponseAuth {
  /** The full protocol version this response was served in, such as `0.5.1`
   *
   * Optional on 401 and 403 responses, because authentication can run before
   * the server selects a version. When present, it can differ from the
   * requested version in the patch number only.
   */
  @Http.header("CG-Version-Served")
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersionServed?: Types.protocolVersion;

  ...VersionLifecycle;
}

/** Caching and retirement headers shared by `VersionResponse` and `VersionResponseAuth` */
@Versioning.added(CommonGrants.Versions.v0_6)
model VersionLifecycle {
  /** Request header names that shared caches must key this response on
   *
   * Required on every cacheable response that depends on `CG-Version`,
   * including responses served in the server's default version, and must then
   * list `CG-Version`, as in `Vary: CG-Version`. It may list other header
   * names too.
   */
  @Http.header("Vary")
  @Versioning.added(CommonGrants.Versions.v0_6)
  vary?: string;

  /** When the served version was or will be deprecated (RFC 9745)
   *
   * A Structured Field Date: `@` followed by a Unix timestamp, such as
   * `@1796083200`. Sent only while the version being served is retiring,
   * never for a change of default.
   */
  @pattern("^@-?[0-9]+$")
  @Http.header("Deprecation")
  @Versioning.added(CommonGrants.Versions.v0_6)
  deprecation?: string;

  /** When the served version stops responding (RFC 8594), as an HTTP-date
   *
   * For example, `Tue, 01 Jun 2027 00:00:00 GMT`.
   * Sent only while the version being served is retiring and a date is set,
   * never for a change of default. After this date, requests for the version
   * get a `version.retired` error.
   */
  @encode(DateTimeKnownEncoding.rfc7231)
  @Http.header("Sunset")
  @Versioning.added(CommonGrants.Versions.v0_6)
  sunset?: utcDateTime;

  /** Links about the served version's lifecycle (RFC 8288)
   *
   * Servers may send several `Link` headers. While the served version is
   * retiring: `rel="deprecation"` and `rel="sunset"` point to migration
   * documentation. While the default is changing, on responses served by
   * default: `rel="successor-version"` points to documentation for the new
   * default. In both cases `rel="version-history"` points to
   * `/common-grants/versions`, as in
   * `<https://grants.example.org/common-grants/versions>; rel="version-history"`.
   */
  @Http.header("Link")
  @Versioning.added(CommonGrants.Versions.v0_6)
  link?: string;
}
