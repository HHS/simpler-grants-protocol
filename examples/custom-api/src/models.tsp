import "@common-grants/core";
import "@typespec/json-schema";

using JsonSchema;
using CommonGrants;

@jsonSchema
namespace CustomAPI.CustomModels;

/** Custom */
model OpportunityNumber extends Fields.CustomField {
    name: "Funding Opportunity Number";
    type: Fields.CustomFieldType.string;

    @example("ABC-2025-001")
    value: string;

    description: "The unique identifier for a given opportunity within this API";
}

model CustomOpportunity extends Models.OpportunityBase {
    @example(#{
        fundingOpportunityNumber: #{
            name: "Funding Opportunity Number",
            type: Fields.CustomFieldType.string,
            value: "ABC-2025-001",
            description: "The unique identifier for a given opportunity within this API",
        },
    })
    customFields: {
        fundingOpportunityNumber: OpportunityNumber;
    };
}
