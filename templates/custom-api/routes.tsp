// routes.tsp

import "@common-grants/core";
import "./models.tsp";

// Allows us to use models defined in the specification library
// without prefixing each model with `CommonGrants.Routes.`
using CommonGrants.Routes;
using TypeSpec.Http;

@tag("Search")
@route("/opportunities")
namespace {{parameters.namespace}}.Routes {
  alias OpportunitiesRouter = Opportunities;

  // Use the default model for list but custom model for read
  op list is OpportunitiesRouter.list<Models.CustomOpportunity>;
  op read is OpportunitiesRouter.read<Models.CustomOpportunity>;
}
