import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.LegacyId;

/** An integer ID for the opportunity, needed for compatibility with legacy systems */
model CustomLegacyId extends CustomField {
  name: "legacyId";
  fieldType: CustomFieldType.integer;

  @example(12345)
  value: integer;

  description: "An integer ID for the opportunity, needed for compatibility with legacy systems";
}
