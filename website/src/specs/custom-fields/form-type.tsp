import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FormType;

/** Form type identifier (e.g. SF424) (catalog only — not in SDK/API yet) */
@extension("x-tags", #[Tags.form, Tags.type, Tags.catalogOnly])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.FormBase])
model CustomFormType extends CustomField {
  name: "formType";
  fieldType: CustomFieldType.string;

  @example("SF424")
  value: string;

  description: "Form type (e.g. SF424)";
}
