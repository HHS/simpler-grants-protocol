import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.ApplicationAttachments;

/** Application attachments (catalog only — not in SDK/API yet) */
@extension(
  "x-tags",
  #[Tags.application, Tags.attachments, Tags.files, Tags.catalogOnly]
)
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.ApplicationBase])
model CustomApplicationAttachments extends CustomField {
  name: "applicationAttachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "Attachments submitted with the application";
}
