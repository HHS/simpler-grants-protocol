import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FiscalYear;

/** The fiscal year associated with this opportunity */
@extension("x-tags", #[Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomFiscalYear extends CustomField {
  name: "fiscalYear";
  fieldType: CustomFieldType.integer;

  @example(2025)
  value: integer;

  description: "The fiscal year associated with this opportunity";
}
