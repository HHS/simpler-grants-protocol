import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/aor/aor-name.tsp";
import "../question-bank/aor/aor-title.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.AorName;
using QuestionBank.AorTitle;
using QuestionBank.QuestionName;

namespace Forms.CD511;

/**
 * CD-511 Certification Regarding Lobbying.
 *
 * Captures the AOR certification against lobbying violations for a grant
 * application or award. Composes org name + AOR name + AOR title from the
 * question bank and adds form-specific fields for award context and signature.
 *
 * The legacy hand-written version lives at website/src/content/forms/cd511/.
 * Reviewers compare the two via /forms-new/cd511 vs /forms/cd511 during migration.
 */
@extension("x-tags", #["cd511", "application"])
model CD511 {
  /** Legal name of the applicant organization */
  @example(#{ name: "Example Research Institute" })
  org: QuestionOrgName;

  /** Project award number */
  @example("CD511-2024-001")
  awardNumber?: string;

  /** Name of the project */
  @example("Advanced Research Project")
  projectName?: string;

  /** Authorized Organization Representative name */
  @example(#{
    prefix: NamePrefix.Dr,
    firstName: "Jane",
    middleName: "Q",
    lastName: "Smith",
    suffix: NameSuffix.PhD,
  })
  aorName: QuestionAorName;

  /** Authorized Organization Representative title */
  @example(#{ title: "Research Director" })
  aorTitle: QuestionAorTitle;

  /** AOR signature — system-generated when submitted through Grants.gov */
  @example("")
  signature: string;

  /** Date the AOR signed the application — system-generated when submitted through Grants.gov */
  @format("date")
  @example("2024-03-20")
  submittedDate: string;
}
