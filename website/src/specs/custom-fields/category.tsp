import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.Category;

/** The category of the opportunity (e.g., discretionary, mandatory) */
@extension("x-tags", #[Tags.classification, Tags.type])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomCategory extends CustomField {
  name: "category";
  fieldType: CustomFieldType.string;

  @example("discretionary")
  value: string;

  description: "The category type of the grant opportunity";
}
