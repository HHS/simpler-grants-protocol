// routes.tsp

import "@common-grants/core";
import "./models.tsp"; // Import the custom field and model from above

using CommonGrants.Routes;
using TypeSpec.Http;

@tag("Opportunities")
@route("/opportunities")
namespace CustomAPI.CustomRoutes {
    alias OpportunitiesRouter = Opportunities;

    op list is OpportunitiesRouter.list<CustomModels.CustomOpportunity>;
    op read is OpportunitiesRouter.read<CustomModels.CustomOpportunity>;

    @put
    @summary("Update an opportunity")
    @doc("Update the values of an opportunity")
    op update(data: CustomModels.CustomOpportunity): {
        status: Http.OkResponse;
        data: CustomModels.CustomOpportunity;
    };
}
