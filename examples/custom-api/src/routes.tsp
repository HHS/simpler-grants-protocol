import "@typespec/http";
import "@typespec/rest";

import "@opportunity-stream/core";

import "./models.tsp";

using OpportunityStream;
using Http;

namespace CustomAPI.CustomRoutes;

// Reuse the existing routes, extending functionality
interface CustomOpportunities extends Routes.Opportunities {
    // Override the existing @read() route with the custom model
    @summary("View opportunity")
    @doc("View the details for a given opportunity")
    @get
    read(@path id: string): CustomModels.CustomOpportunity;

    // Add a new route with the custom model
    @summary("Update opportunity")
    @doc("Update a given opportunity's details")
    @put
    update(@path id: string, @body data: CustomModels.CustomOpportunity): {
        @statusCode statusCode: 200;
        @body result: CustomModels.CustomOpportunity;
    };
}
