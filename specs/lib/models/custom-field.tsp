namespace OpportunityStream.Models;

/** The set of JSON schema types supported by a custom field */
enum CustomFieldType {
  string,
  number,
  boolean,
  object,
  array,
}

model CustomField {
  /** Name of the custom field */
  name: string;

  /** The JSON schema type to use when de-serializing the `value` field */
  type: CustomFieldType;

  /** Format specification for the field */
  format: string;

  /** Value of the custom field */
  value: unknown;

  /** Description of the custom field's purpose */
  description?: string;

  /** Optional URL with additional information */
  context?: url;
}
