// routes.tsp

import "@common-grants/core";
import "./models.tsp"; // Import the custom field and model from above

using CommonGrants.Routes;
using TypeSpec.Http;

@tag("CommonGrants")
@tag("Opportunities")
@route("/common-grants/opportunities")
namespace CustomAPI.BaseRoutes {
    alias OpportunitiesRouter = Opportunities;

    op list is OpportunitiesRouter.list<CustomModels.CustomOpportunity>;
    op read is OpportunitiesRouter.read<CustomModels.CustomOpportunity>;
    op search is OpportunitiesRouter.search<CustomModels.CustomOpportunity>;
}

@tag("Custom")
@tag("Opportunities")
@route("/opportunities")
namespace CustomAPI.CustomRoutes {
    @put
    @summary("Update an opportunity")
    @doc("Update the values of an opportunity")
    op update(data: CustomModels.CustomOpportunity): {
        status: Http.OkResponse;
        data: CustomModels.CustomOpportunity;
    };
}
