import "@typespec/http";
import "@typespec/versioning";
import "./types.tsp";

/** HTTP headers shared by every CommonGrants protocol route
 *
 * These models are spread into route parameters, so they appear as headers in
 * the OpenAPI document, never as fields in a JSON Schema. They implement the
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
   * A full published version. A `v` prefix and short forms such as `0.5` are
   * malformed. Servers match on major and minor version, so a request for
   * `0.5.0` can be served by a server hosting `0.5.1`. Send one value per
   * request. When the header is absent, the server responds in its default
   * version. Header names are case-insensitive.
   */
  @Http.header("CG-Version")
  // This property-level `@added` is what keeps the header out of 0.1.0 to
  // 0.5.0: spreading copies properties without the model's versioning.
  @Versioning.added(CommonGrants.Versions.v0_6)
  cgVersion?: Types.protocolVersion;
}
