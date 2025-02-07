// models.tsp

import "@common-grants/core";

// Allows us to use models defined in the specification library
// without prefixing each model with `CommonGrants.Models.`
using CommonGrants.Models;

@TypeSpec.JsonSchema.jsonSchema
namespace {{parameters.namespace}}.Models;

// Define a custom field
model {{parameters.fieldNamePascal}} extends CustomField {
  name: "{{parameters.fieldNameDisplay}}";
  type: CustomFieldType.{{parameters.fieldTypeJSON}};
  value: {{parameters.fieldTypeTSP}};
  description: "{{parameters.fieldDescription}}";
}

// Create a custom Opportunity type using the template
model CustomOpportunity extends Opportunity.OpportunityBase {

  // Add an example of the new customFields object using `@example()`
  customFields: {
    {{parameters.fieldNamePascal}}: {{parameters.fieldNamePascal}};
  };
}
