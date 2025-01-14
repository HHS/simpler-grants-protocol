import "@opportunity-stream/core";
import "@typespec/json-schema";

using JsonSchema;
using OpportunityStream;

@jsonSchema
namespace CustomAPI.CustomModels;

model OpportunityNumber extends Models.CustomField {
    name: "Funding Opportunity Number";
    type: Models.CustomFieldType.string;

    @example("ABC-2025-001")
    value: string;

    description: "The unique identifier for a given opportunity within this API";
}

model CustomOpportunity extends Models.Opportunity {
    customFields: {
        fundingOpportunityNumber: OpportunityNumber;
    };
}
