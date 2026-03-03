import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.Category;

/** The category of the opportunity (e.g., discretionary, mandatory) */
model CustomCategory extends CustomField {
  name: "category";
  fieldType: CustomFieldType.string;

  @example("discretionary")
  value: string;

  description: "The category type of the grant opportunity";
}
