import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.AdditionalInfo;

/** Additional information URL and description */
@extension("x-tags", #[Tags.context])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomAdditionalInfo extends CustomField {
  name: "additionalInfo";
  fieldType: CustomFieldType.object;

  @example(#{
    url: "https://simpler.grants.gov/documents/example",
    description: "More information about the opportunity requirements",
  })
  value: {
    /** A URL linking to additional information about the opportunity */
    url?: url;

    /** A human-readable description of the additional information */
    description?: string;
  };

  description: "URL and description for additional information about the opportunity";
}
