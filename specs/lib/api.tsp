// Import Schemas.and Routes to make them available outside the package
import "./core/index.tsp";
import "@typespec/http";

using TypeSpec.Http;

/** The base OpenAPI specification for a CommonGrants API
 *
 * In order for an API to be "compliant" with the CommonGrants protocol,
 * it must implement all of the routes with the "required" tag in this specification.
 */
@service({
  title: "CommonGrants Base API",
})
namespace CommonGrants.API;

@tag("Opportunities")
@route("/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  @tag("required")
  op List is Router.list;

  @tag("required")
  op Read is Router.read;
}
