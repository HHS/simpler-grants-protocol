import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.LegacyFormId;

/** Legacy form ID for lookups from systems using old grants.gov IDs (catalog only — not in SDK/API yet) */
model CustomLegacyFormId extends CustomField {
  name: "legacyFormId";
  fieldType: CustomFieldType.string;

  @example("GRANTS-12345")
  value: string;

  description: "Legacy form identifier for lookups in the new system";
}
