import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/poc/poc-details.tsp";
import "../question-bank/project/project-details.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.PocDetails;
using QuestionBank.ProjectDetails;

namespace Forms.FormB;

/** Type of research institution */
enum InstitutionType {
  University: "University",
  Nonprofit: "Nonprofit",
  Government: "Government",
  Corporation: "Corporation",
  IndependentResearcher: "Independent Researcher",
  NotListed: "Not Listed",
}

/**
 * Form B - Research Grant Application.
 *
 * A research grant application form capturing principal investigator info,
 * institution type and name, and project details.
 */
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      contact: #{ label: "Principal Investigator" },
      institutionType: #{ label: "Institution Type" },
    },
  }
)
@extension("x-tags", #["formB", "research", "application"])
model FormB {
  /** Principal investigator (primary contact for the research grant). */
  @example(#{
    name: #{ firstName: "Bob", middleName: "B.", lastName: "Barker" },
    title: "Principal Investigator",
    email: "email@example.edu",
    phone: #{ countryCode: "+1", number: "555-111-2222" },
  })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        `name.prefix`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/name/properties/prefix",
              schema: #{},
            },
          },
        },
        `name.firstName`: #{ label: "PI First Name" },
        `name.lastName`: #{ label: "PI Last Name" },
        email: #{ label: "PI Email" },
      },
    }
  )
  contact: QuestionPocDetails;

  /** Research institution */
  @example(#{ name: "Research University" })
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Institution Name" } } }
  )
  org: QuestionOrgName;

  /** Type of research institution */
  @example(InstitutionType.University)
  @extension(
    "x-mapping-from-cg",
    #{ field: "organizations.primary.orgType.term" }
  )
  institutionType: InstitutionType;

  /** Project details */
  @example(#{
    title: "Project B",
    description: "Project B",
    amountRequested: #{ amount: "25000", currency: "USD" },
    startDate: "2025-06-01",
    endDate: "2026-06-01",
  })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        title: #{ label: "Research Project Name" },
        `amountRequested.amount`: #{ label: "Total Budget (USD)" },
        startDate: #{ label: "Kick-off Date" },
        endDate: #{ label: "Completion Date" },
      },
    }
  )
  project: QuestionProjectDetails;
}
