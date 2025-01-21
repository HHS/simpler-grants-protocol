import "../models/index.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Rest;

// Define the `/opportunities` router
@route("/opportunities")
interface Opportunities {
  @summary("List opportunities")
  @doc("Get a list of opportunities")
  @get
  list(): Models.Opportunity[];

  @summary("View opportunity")
  @doc("View additional details about an opportunity")
  @get
  read(@path title: string): Models.Opportunity;
}
