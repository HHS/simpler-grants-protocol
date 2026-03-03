import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.ApplicantOrganization;

/** Applicant organization (catalog only — not in SDK/API yet) */
model CustomApplicantOrganization extends CustomField {
  name: "applicantOrganization";
  fieldType: CustomFieldType.object;

  @example(#{ name: "Acme Research Institute", identifier: "DUNS-123456789" })
  value: {
    name?: string;
    identifier?: string;
  };

  description: "Applicant organization details for the application";
}
