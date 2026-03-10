import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FormGroup;

/** Group label for related forms (e.g. SF424, Budget, Narrative) */
@extension("x-tags", #[Tags.identifier])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.FormBase])
model CustomFormGroup extends CustomField {
  name: "formGroup";
  fieldType: CustomFieldType.string;

  @example("SF424")
  value: string;

  description: "Group label for related forms (e.g. SF424, Budget, Narrative)";
}
