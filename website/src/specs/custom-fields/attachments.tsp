import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.Attachments;

/** List of attachments associated with the opportunity */
model CustomAttachments extends CustomField {
  name: "attachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "Attachments such as NOFOs and supplemental documents for the opportunity";
}
