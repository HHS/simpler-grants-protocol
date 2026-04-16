import "@typespec/json-schema";
import "../question-bank/primary-org/org-details.tsp";
import "../question-bank/poc/poc-details.tsp";
import "../question-bank/aor/aor-details.tsp";

using JsonSchema;
using QuestionBank.OrgDetails;
using QuestionBank.PocDetails;
using QuestionBank.AorDetails;

namespace Forms.SF424Mandatory;

/**
 * SF-424 mandatory contact information section.
 * Composes org + contact + AOR — all three include QuestionAddress,
 * which is the multi-composite case that triggers the AJV shared-refs error.
 */
@extension("x-tags", #["sf424", "application"])
model SF424Mandatory {
  /** Primary applicant organization */
  org: QuestionOrgDetails;

  /** Primary point of contact */
  contact: QuestionPocDetails;

  /** Authorized Organization Representative */
  aor: QuestionAorDetails;
}
