import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.Attachments;

/** File attachments associated with this resource */
@extension("x-tags", #[Tags.context])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[
    ValidSchemas.OpportunityBase,
    ValidSchemas.CompetitionBase,
    ValidSchemas.ApplicationBase
  ]
)
model CustomAttachments extends CustomField {
  name: "attachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "File attachments associated with this resource";
}
