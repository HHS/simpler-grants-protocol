import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/poc/poc-details.tsp";
import "../question-bank/project/project-details.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.PocDetails;
using QuestionBank.ProjectDetails;

namespace Forms.FormA;

/** Type of applicant organization */
enum FormAApplicantType {
  Nonprofit: "Nonprofit",
  ForProfit: "For-profit",
  Government: "Government",
  Individual: "Individual",
  Other: "Other",
}

/**
 * Form A - Basic Grant Application.
 *
 * A basic grant application form capturing applicant contact info,
 * organization name, applicant type, and project details.
 */
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      contact: #{ label: "Applicant Information" },
      applicantType: #{ label: "Applicant Type" },
    },
  }
)
@extension("x-tags", #["formA", "application"])
model FormA {
  /** Primary point of contact / applicant */
  @example(#{
    name: #{ firstName: "Alice", lastName: "Alvarez" },
    title: "Project Manager",
    email: "email@example.com",
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
        `name.middleName`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/contact/properties/name/properties/middleName",
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
      },
    }
  )
  contact: QuestionPocDetails;

  /** Applicant organization */
  @example(#{ name: "Example Organization" })
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Organization Name" } } }
  )
  org: QuestionOrgName;

  /** Type of applicant organization */
  @example(FormAApplicantType.Nonprofit)
  @extension(
    "x-mapping-from-cg",
    #{ field: "organizations.primary.orgType.term" }
  )
  applicantType: FormAApplicantType;

  /** Project details */
  @example(#{
    title: "Project A",
    description: "Project A",
    amountRequested: #{ amount: "1000", currency: "USD" },
    startDate: "2025-07-01",
    endDate: "2026-07-01",
  })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        `amountRequested.amount`: #{ label: "Requested Amount (USD)" },
        `amountRequested.currency`: #{
          rule: #{
            effect: "HIDE",
            condition: #{
              scope: "#/properties/project/properties/amountRequested/properties/currency",
              schema: #{},
            },
          },
        },
      },
    }
  )
  project: QuestionProjectDetails;
}
