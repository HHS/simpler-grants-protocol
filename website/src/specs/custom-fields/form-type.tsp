import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.FormType;

/** Form type identifier (e.g. SF424) (catalog only — not in SDK/API yet) */
model CustomFormType extends CustomField {
  name: "formType";
  fieldType: CustomFieldType.string;

  @example("SF424")
  value: string;

  description: "Form type (e.g. SF424)";
}
