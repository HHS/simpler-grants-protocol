import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.LegacySerialId;

/** An integer ID needed for compatibility with legacy systems that use serial/integer identifiers */
@extension("x-tags", #[Tags.identifier, Tags.compatibility])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[
    ValidSchemas.OpportunityBase,
    ValidSchemas.CompetitionBase,
    ValidSchemas.ApplicationBase,
    ValidSchemas.FormBase
  ]
)
model CustomLegacySerialId extends CustomField {
  name: "legacySerialId";
  fieldType: CustomFieldType.integer;

  @example(12345)
  value: integer;

  description: "An integer ID needed for compatibility with legacy systems that use serial/integer identifiers";
}
