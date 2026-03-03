import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.EligibilityCriteria;

/** Free-text eligibility description; may be expanded to a structured object later as adopters bring richer data */
model CustomEligibilityCriteria extends CustomField {
  name: "eligibilityCriteria";
  fieldType: CustomFieldType.string;

  @example("Eligible applicants include state and local governments, nonprofits, and institutions of higher education.")
  value: string;

  description: "Eligibility criteria for applicants (free-text); future versions may support structured applicant types, beneficiary types, and geographic eligibility";
}
