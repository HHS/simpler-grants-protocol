import "../models/index.tsp";

// Define the top-level namespace for OpportunityStream routes
namespace OpportunityStream.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Rest;

// Define the `/opportunities` router
@route("/opportunities")
interface Opportunities {
  @get list(): Models.Opportunity[];

  @get read(@path title: string): Models.Opportunity;
}
