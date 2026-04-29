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
 */
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      awardNumber: #{ label: "Award Number" },
      projectName: #{ label: "Project Name" },
      signature: #{ label: "Signature" },
      submittedDate: #{ label: "Date" },
    },
  }
)
@extension("x-tags", #["cd511", "application"])
model CD511 {
  /** Legal name of the applicant organization */
  @example(#{ name: "Example Research Institute" })
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Organization Name" } } }
  )
  org: QuestionOrgName;

  /** Project award number */
  @example("CD511-2024-001")
  @extension("x-mapping-from-cg", #{ field: "customFields.awardNumber.value" })
  awardNumber?: string;

  /** Name of the project */
  @example("Advanced Research Project")
  @extension("x-mapping-from-cg", #{ field: "title" })
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
  @extension("x-overrides", #{ uiSchema: #{ title: #{ label: "Title" } } })
  aorTitle: QuestionAorTitle;

  /** AOR signature — system-generated when submitted through Grants.gov */
  @example("")
  @maxLength(144)
  @extension("x-mapping-from-cg", #{ field: "customFields.signature.value" })
  signature: string;

  /** Date the AOR signed the application — system-generated when submitted through Grants.gov */
  @format("date")
  @example("2024-03-20")
  @extension(
    "x-mapping-from-cg",
    #{ field: "customFields.submittedDate.value" }
  )
  submittedDate: string;
}
