// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import Models and Routes to make them available outside the package
import "./models/index.tsp";
import "./routes/index.tsp";

using TypeSpec.Http;

// Define the top-level namespace for the library
@service({
  name: "Base API",
})
namespace CommonGrants.API;

@tag("Search")
@route("/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  op List is Router.list;
  op Read is Router.read;
}
