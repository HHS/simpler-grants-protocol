import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/poc/poc-details.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.PocDetails;

namespace Forms.KeyContact;

/**
 * Grants.gov "Key Contacts" form (FID 683).
 *
 * Captures the primary point of contact for a grant application along
 * with their role on the project. The applicant organization name doubles
 * as the link to ApplicantInfo on full applications.
 *
 * The legacy hand-written version (no longer the source of truth) lives
 * at website/src/content/forms/key-contact/. Reviewers compare the two
 * via /forms-new/key-contact vs /forms/key-contact during migration.
 */
@extension("x-tags", #["key-contact", "application"])
model KeyContact {
  /** Applicant organization */
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Applicant Organization Name" } } }
  )
  org: QuestionOrgName;

  /** Primary point of contact for the project */
  contact: QuestionPocDetails;

  /** This contact's role on the project (e.g. Project Director, Fiscal Contact) */
  @example("Project Director")
  projectRole: string;
}
