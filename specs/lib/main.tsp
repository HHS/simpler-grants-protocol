// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import Models and Routes to make them available outside the package
import "./models/index.tsp";
import "./routes/index.tsp";

using TypeSpec.Http;

/** The base OpenAPI specification for a CommonGrants API
 *
 * In order for an API to be "compliant" with the CommonGrants protocol,
 * it must implement all of the routes included in this base specification.
 */
@service({
  title: "Base API",
})
namespace CommonGrants.API;

@tag("Opportunities")
@route("/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  op List is Router.list;
  op Read is Router.read;
}
