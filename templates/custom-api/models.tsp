import "@common-grants/core";

// Allows us to use models and fields defined in the specification library
// without prefixing each model with `CommonGrants.Models` or `CommonGrants.Fields`
using CommonGrants.Models;
using CommonGrants.Fields;

@TypeSpec.JsonSchema.jsonSchema
namespace Custom.Models;

// Define a custom field
model {{#casing.pascalCase}}{{parameters.fieldName}}{{/casing.pascalCase}} extends CustomField {
  name: "{{parameters.fieldName}}";
  type: CustomFieldType.{{parameters.fieldTypeJSON}};
  value: {{parameters.fieldTypeTSP}};
  description: "{{parameters.fieldDescription}}";
}

// Create a custom Opportunity type using the template
model CustomOpportunity extends OpportunityBase {

  // Add an example of the new customFields object using `@example()`
  customFields: {
    {{#casing.camelCase}}{{parameters.fieldName}}{{/casing.camelCase}}: {{#casing.pascalCase}}{{parameters.fieldName}}{{/casing.pascalCase}};
  };
}
