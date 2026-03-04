import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.FiscalYear;

/** The fiscal year for the opportunity */
@extension("x-tags", #[Tags.fiscal, Tags.year, Tags.budget])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomFiscalYear extends CustomField {
  name: "fiscalYear";
  fieldType: CustomFieldType.number;

  @example(2026)
  value: integer;

  description: "The fiscal year associated with this opportunity";
}
