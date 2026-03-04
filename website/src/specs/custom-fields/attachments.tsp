import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.Attachments;

/** List of attachments associated with the opportunity */
@extension("x-tags", #[Tags.documents, Tags.files, Tags.attachments])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomAttachments extends CustomField {
  name: "attachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "Attachments such as NOFOs and supplemental documents for the opportunity";
}
