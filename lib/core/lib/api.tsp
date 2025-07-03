// Import Schemas.and Routes to make them available outside the package
import "./core/index.tsp";
import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

/** The base OpenAPI specification for a CommonGrants API
 *
 * In order for an API to be "compliant" with the CommonGrants protocol,
 * it must implement all of the routes with the "required" tag in this specification.
 */
@service(#{ title: "CommonGrants Base API" })
@tagMetadata(
  "optional",
  #{ description: "Endpoints that MAY be implemented by CommonGrants APIs" }
)
@tagMetadata(
  "required",
  #{
    description: "Endpoints that MUST be implemented by all CommonGrants APIs",
  }
)
@tagMetadata(
  "Opportunities",
  #{ description: "Endpoints related to funding opportunities" }
)
namespace CommonGrants.API;

@tag("Opportunities")
@route("/common-grants/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  // @tag("required")
  // op list is Router.list;

  // @tag("required")
  // op read is Router.read;

  // @tag("optional")
  // op search is Router.search;
}
