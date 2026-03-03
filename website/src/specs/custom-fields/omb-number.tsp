import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.OmbNumber;

/** OMB control number for PRA compliance (catalog only — not in SDK/API yet) */
model CustomOmbNumber extends CustomField {
  name: "ombNumber";
  fieldType: CustomFieldType.string;

  @example("4040-0001")
  value: string;

  description: "OMB control number, required for Paperwork Reduction Act (PRA) compliance";
}
