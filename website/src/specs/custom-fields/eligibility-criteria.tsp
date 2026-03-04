import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.EligibilityCriteria;

/** Free-text eligibility description; may be expanded to a structured object later as adopters bring richer data */
@extension("x-tags", #[Tags.eligibility, Tags.applicant])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension("x-valid-schemas", #[ValidSchemas.OpportunityBase])
model CustomEligibilityCriteria extends CustomField {
  name: "eligibilityCriteria";
  fieldType: CustomFieldType.string;

  @example("Eligible applicants include state and local governments, nonprofits, and institutions of higher education.")
  value: string;

  description: "Eligibility criteria for applicants (free-text); future versions may support structured applicant types, beneficiary types, and geographic eligibility";
}
