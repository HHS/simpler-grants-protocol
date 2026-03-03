import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.FiscalYear;

/** The fiscal year for the opportunity */
model CustomFiscalYear extends CustomField {
  name: "fiscalYear";
  fieldType: CustomFieldType.number;

  @example(2026)
  value: integer;

  description: "The fiscal year associated with this opportunity";
}
