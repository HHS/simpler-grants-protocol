import "@typespec/json-schema";
import "../question-bank/poc/poc-details.tsp";
import "../question-bank/project/project-details.tsp";

using JsonSchema;
using QuestionBank.PocDetails;
using QuestionBank.ProjectDetails;
using QuestionBank.QuestionName;
using QuestionBank.QuestionAddress;

namespace Forms.SF424Individual;

/**
 * SF-424 Individual Application for Federal Assistance.
 *
 * The individual-applicant variant of the SF-424. Unlike the standard SF-424,
 * this form collects the applicant's personal contact information directly
 * rather than via an organizational AOR.
 *
 * Composes poc (individual applicant contact) + project details from the
 * question bank, and adds SF-424-Individual-specific fields (opportunity info,
 * citizenship, congressional district, and certification).
 *
 * The legacy hand-written version lives at website/src/content/forms/sf424-individual/.
 * Reviewers compare the two via /forms-new/sf424-individual vs /forms/sf424-individual
 * during migration.
 */
@extension("x-tags", #["sf424-individual", "application"])
model SF424Individual {
  // == Grant opportunity information ==

  /** Name of the awarding federal agency — pre-populated from Application cover sheet */
  @example("Department of Health and Human Services")
  federalAgency: string;

  /** Assistance Listing (CFDA) Number — pre-populated from Application cover sheet */
  @example("93.123")
  cfdaNumber?: string;

  /** Assistance Listing (CFDA) Title — pre-populated from Application cover sheet */
  @example("Example Grant Program")
  cfdaTitle?: string;

  /** Date received — completed by Grants.gov upon submission */
  @format("date")
  @example("")
  dateReceived?: string;

  /** Funding opportunity number — pre-populated from Application cover sheet */
  @example("ABC-123-456")
  opportunityId: string;

  /** Funding opportunity title — pre-populated from Application cover sheet */
  @example("Example Funding Opportunity")
  opportunityTitle: string;

  // == Individual applicant contact information ==

  /** Individual applicant's contact information */
  @example(#{
    name: #{
      prefix: NamePrefix.Dr,
      firstName: "John",
      middleName: "Q",
      lastName: "Smith",
      suffix: NameSuffix.PhD,
    },
    address: #{
      street1: "123 Main Street",
      street2: "Suite 100",
      city: "Washington",
      state: USState.DC,
      country: "US",
      postalCode: "20001",
    },
    phone: #{ countryCode: "+1", number: "555-123-4567" },
    email: "john.smith@example.com",
  })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        title: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/applicant/properties/title", schema: #{} }
          }
        },
        `phone.countryCode`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/applicant/properties/phone/properties/countryCode", schema: #{} }
          }
        },
        `phone.extension`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/applicant/properties/phone/properties/extension", schema: #{} }
          }
        },
        `phone.isMobile`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/applicant/properties/phone/properties/isMobile", schema: #{} }
          }
        }
      }
    }
  )
  applicant: QuestionPocDetails;

  /** Evening telephone number */
  @example("555-987-6543")
  eveningPhone?: string;

  /** Fax number */
  @example("555-456-7890")
  fax?: string;

  // == Citizenship ==

  /** U.S. citizenship status */
  @example("Y: Yes")
  citizenship: string;

  /** Alien Registration Number (required if not a U.S. citizen) */
  @example("")
  alienRegistrationNumber?: string;

  /** Country of citizenship */
  @example("")
  countryOfOrigin?: string;

  /** Start date of most recent U.S. residency (required if not a U.S. citizen) */
  @format("date")
  @example("")
  visitDate?: string;

  // == Location ==

  /** County or parish of the applicant address */
  @example("District of Columbia")
  county?: string;

  /** Province of the applicant address */
  @example("")
  province?: string;

  /** Congressional district of the applicant (format: XX-###, e.g. CA-005) */
  @example("DC-000")
  congressionalDistrictApplicant: string;

  // == Project information ==

  /** Core project details including title, description, and performance period */
  @example(#{
    title: "Example Research Project",
    description: "This is an example research project description that outlines the goals, objectives, and expected outcomes of the proposed work.",
    startDate: "2024-10-01",
    endDate: "2025-09-30",
  })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        `amountRequested.amount`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/project/properties/amountRequested/properties/amount", schema: #{} }
          }
        },
        `amountRequested.currency`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/project/properties/amountRequested/properties/currency", schema: #{} }
          }
        }
      }
    }
  )
  project: QuestionProjectDetails;

  // == Certification ==

  /** Applicant agrees to all required certifications */
  @example("Y: Yes")
  applicationCertification: string;
}
