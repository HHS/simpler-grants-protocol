import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.ApplicationAttachments;

/** Application attachments (catalog only — not in SDK/API yet) */
model CustomApplicationAttachments extends CustomField {
  name: "applicationAttachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "Attachments submitted with the application";
}
