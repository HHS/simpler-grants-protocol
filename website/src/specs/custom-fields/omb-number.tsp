import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.OmbNumber;

/** OMB control number for PRA compliance (catalog only — not in SDK/API yet) */
@extension("x-tags", #[Tags.form, Tags.omb, Tags.pra, Tags.catalogOnly])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.FormBase])
model CustomOmbNumber extends CustomField {
  name: "ombNumber";
  fieldType: CustomFieldType.string;

  @example("4040-0001")
  value: string;

  description: "OMB control number, required for Paperwork Reduction Act (PRA) compliance";
}
