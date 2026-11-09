import "../models/index.tsp";
import "../responses/index.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Versioning;

/** A re-usable interface for the versions discovery router
 *
 * Unlike the other routers, `read` is deliberately not templated: adopters
 * don't extend the discovery response. Routes that differ from the API-wide
 * versions are described in the response's `operations` field instead.
 *
 * @example Declaring the versions discovery route:
 * ```typespec
 * using TypeSpec.Http;
 *
 * @tag("Versions")
 * @route("/versions")
 * namespace ProtocolVersions {
 *   alias Router = Routes.ProtocolVersions;
 *
 *   op read is Router.read;
 * }
 * ```
 */
@added(CommonGrants.Versions.v0_6)
interface ProtocolVersions {
  // ###############################
  // List supported versions
  // ###############################

  /** `GET /versions` List the protocol versions this API serves */
  @summary("List supported versions")
  @doc("""
    List the protocol versions this API serves, its default version, and any routes whose versions differ.
    
    This route is optional, but a server that serves more than one protocol version MUST implement it.
    It ignores the `CG-Version` request header, because clients call it before they know which version to request.
    It SHOULD be readable without authentication.
    Fields are only ever added to the response; clients ignore fields they don't recognize.
    """)
  @get
  read(): Responses.OkT<Models.VersionDiscovery>;
}
