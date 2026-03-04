import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.LegacyFormId;

/** Legacy form ID for lookups from systems using old grants.gov IDs (catalog only — not in SDK/API yet) */
@extension("x-tags", #[Tags.form, Tags.migration, Tags.catalogOnly])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.FormBase])
model CustomLegacyFormId extends CustomField {
  name: "legacyFormId";
  fieldType: CustomFieldType.string;

  @example("GRANTS-12345")
  value: string;

  description: "Legacy form identifier for lookups in the new system";
}
