import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.FormAgencyCode;

/** Which agency owns the form (catalog only — not in SDK/API yet) */
model CustomFormAgencyCode extends CustomField {
  name: "agencyCode";
  fieldType: CustomFieldType.string;

  @example("US-ABC")
  value: string;

  description: "Agency code for the form owner";
}
