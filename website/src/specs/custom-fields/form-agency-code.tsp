import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FormAgencyCode;

/** Which agency owns the form (catalog only — not in SDK/API yet) */
@extension("x-tags", #[Tags.form, Tags.agency, Tags.catalogOnly])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.FormBase])
model CustomFormAgencyCode extends CustomField {
  name: "agencyCode";
  fieldType: CustomFieldType.string;

  @example("US-ABC")
  value: string;

  description: "Agency code for the form owner";
}
