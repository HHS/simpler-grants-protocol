namespace OpportunityStream.Models;

// ########################################
// Model definition
// ########################################

/** The set of JSON schema types supported by a custom field */
enum CustomFieldType {
  string,
  number,
  boolean,
  object,
  array,
}

@example(CustomFieldExamples.programArea, #{ title: "String field for program area" })
@example(CustomFieldExamples.eligibilityTypes, #{ title: "Array field for eligibility types" })
model CustomField {
  /** Name of the custom field */
  name: string;

  /** The JSON schema type to use when de-serializing the `value` field */
  type: CustomFieldType;

  /** Link to the full JSON schema for this custom field */
  schema?: url;

  /** Value of the custom field */
  value: unknown;

  /** Description of the custom field's purpose */
  description?: string;

  /** Optional URL with additional information */
  context?: url;
}

// ########################################
// Model examples
// ########################################

namespace CustomFieldExamples {
  /** An example of a string custom field */
  const programArea = #{
    name: "programArea",
    type: CustomFieldType.string,
    value: "Healthcare Innovation",
    description: "Primary focus area of the grant program",
    context: "https://example.com/program-areas",
  };

  /** An example of an array custom field */
  const eligibilityTypes = #{
    name: "eligibilityType",
    type: CustomFieldType.array,
    value: #["nonprofit", "academic"],
    description: "Types of eligible organizations",
  };
}
