import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.ApplicantOrganization;

/** Applicant organization (catalog only — not in SDK/API yet) */
@extension("x-tags", #[Tags.organization])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.ApplicationBase])
model CustomApplicantOrganization extends CustomField {
  name: "applicantOrganization";
  fieldType: CustomFieldType.object;

  @example(#{ name: "Acme Research Institute", identifier: "DUNS-123456789" })
  value: {
    /** The legal name of the applicant organization */
    name?: string;

    /** A unique identifier for the organization (e.g. SAM UEI, DUNS, or EIN) */
    identifier?: string;
  };

  description: "Applicant organization details for the application";
}
