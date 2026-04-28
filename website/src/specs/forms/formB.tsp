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
  /**
   * Principal investigator (primary contact for the research grant).
   * Note: `name.middleName` is intentionally NOT hidden here (FormB keeps
   * it visible for PI middle name). This differs from FormA which hides it.
   */
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
        `name.suffix`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/name/properties/suffix",
              schema: #{},
            },
          },
        },
        address: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/address/properties/street1",
              schema: #{},
            },
          },
        },
        `phone.countryCode`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/phone/properties/countryCode",
              schema: #{},
            },
          },
        },
        `phone.extension`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/phone/properties/extension",
              schema: #{},
            },
          },
        },
        `phone.isMobile`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/phone/properties/isMobile",
              schema: #{},
            },
          },
        },
        `name.firstName`: #{ label: "PI First Name" },
        `name.middleName`: #{ label: "PI Middle Name" },
        `name.lastName`: #{ label: "PI Last Name" },
        title: #{ label: "PI Title" },
        email: #{ label: "PI Email" },
        `phone.number`: #{ label: "PI Phone" },
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
        `amountRequested.currency`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/project/properties/amountRequested/properties/currency",
              schema: #{},
            },
          },
        },
        startDate: #{ label: "Kick-off Date" },
        endDate: #{ label: "Completion Date" },
      },
    }
  )
  project: QuestionProjectDetails;
}
