import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.AdditionalInfo;

/** Additional information URL and description */
model CustomAdditionalInfo extends CustomField {
  name: "additionalInfo";
  fieldType: CustomFieldType.object;

  @example(#{ url: "grants.gov", description: "Click me for more info" })
  value: {
    url: string;
    description?: string;
  };

  description: "URL and description for additional information about the opportunity";
}
