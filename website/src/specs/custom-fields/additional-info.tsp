import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.AdditionalInfo;

/** Additional information URL and description */
@extension("x-tags", #[Tags.information, Tags.url, Tags.reference])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
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
