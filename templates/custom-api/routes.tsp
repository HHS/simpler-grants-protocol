import "@common-grants/core";
import "./models.tsp";

// Allows us to use models defined in the specification library
// without prefixing each model with `CommonGrants.Routes.`
using CommonGrants.Routes;
using TypeSpec.Http;

@tag("Opportunities")
@route("/common-grants/opportunities")
namespace Custom.Routes {
  alias OpportunitiesRouter = Opportunities;

  // Use custom model for list and read
  op list is OpportunitiesRouter.list<Models.CustomOpportunity>;
  op read is OpportunitiesRouter.read<Models.CustomOpportunity>;
  op search is OpportunitiesRouter.search<Models.CustomOpportunity>;
}
