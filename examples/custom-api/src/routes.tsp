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
    @get read(@path id: string): CustomModels.CustomOpportunity;

    // Add a new route with the custom model
    @put
    updatePet(@path id: string, @body data: CustomModels.CustomOpportunity): {
        @statusCode statusCode: 200;
        @body result: CustomModels.CustomOpportunity;
    };
}
