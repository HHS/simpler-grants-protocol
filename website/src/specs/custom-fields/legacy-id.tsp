import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.LegacyId;

/** An integer ID for the opportunity, needed for compatibility with legacy systems */
@extension("x-tags", #[Tags.migration, Tags.compatibility, Tags.identifier])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomLegacyId extends CustomField {
  name: "legacyId";
  fieldType: CustomFieldType.integer;

  @example(12345)
  value: integer;

  description: "An integer ID for the opportunity, needed for compatibility with legacy systems";
}
