import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/primary-org/org-ein.tsp";
import "../question-bank/primary-org/org-uei.tsp";
import "../question-bank/primary-org/org-address.tsp";
import "../question-bank/poc/poc-name.tsp";
import "../question-bank/poc/poc-title.tsp";
import "../question-bank/poc/poc-phone.tsp";
import "../question-bank/poc/poc-email.tsp";
import "../question-bank/aor/aor-name.tsp";
import "../question-bank/aor/aor-title.tsp";
import "../question-bank/aor/aor-phone.tsp";
import "../question-bank/aor/aor-email.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.OrgEin;
using QuestionBank.OrgUei;
using QuestionBank.OrgAddress;
using QuestionBank.PocName;
using QuestionBank.PocTitle;
using QuestionBank.PocPhone;
using QuestionBank.PocEmail;
using QuestionBank.AorName;
using QuestionBank.AorTitle;
using QuestionBank.AorPhone;
using QuestionBank.AorEmail;
using QuestionBank.QuestionName;
using QuestionBank.QuestionAddress;

namespace Forms.SF424Mandatory;

/** Type of submission or frequency */
enum Sf424SubmissionType {
  Application: "Application",
  Preapplication: "Preapplication",
  ChangedCorrectedApplication: "Changed/Corrected Application",
  ChangedCorrectedPreapplication: "Changed/Corrected Preapplication",
  Other: "Other",
}

/** Version of the submission */
enum Sf424Version {
  V1: "1",
  V2: "2",
  V3: "3",
  V4: "4",
  V5: "5",
}

/** Applicant type code */
enum Sf424ApplicantType {
  StateGovernment: "A: State Government",
  CountyGovernment: "B: County Government",
  CityOrTownshipGovernment: "C: City or Township Government",
  SpecialDistrictGovernment: "D: Special District Government",
  RegionalOrganization: "E: Regional Organization",
  USTerritoryOrPossession: "F: U.S. Territory or Possession",
  IndependentSchoolDistrict: "G: Independent School District",
  PublicStateControlledHigherEd: "H: Public/State Controlled Institution of Higher Education",
  TribalGovernmentFederallyRecognized: "I: Indian/Native American Tribal Government (Federally Recognized)",
  TribalGovernmentOther: "J: Indian/Native American Tribal Government (Other than Federally Recognized)",
  TriballyDesignatedOrganization: "K: Indian/Native American Tribally Designated Organization",
  PublicIndianHousingAuthority: "L: Public/Indian Housing Authority",
  NonprofitWith501C3: "M: Nonprofit with 501C3 IRS Status (Other than Institution of Higher Education)",
  NonprofitWithout501C3: "N: Nonprofit without 501C3 IRS Status (Other than Institution of Higher Education)",
  PrivateHigherEd: "O: Private Institution of Higher Education",
  Individual: "P: Individual",
  ForProfitOrganization: "Q: For-Profit Organization (Other than Small Business)",
  SmallBusiness: "R: Small Business",
  HispanicServingInstitution: "S: Hispanic-serving Institution",
  HistoricallyBlackColleges: "T: Historically Black Colleges and Universities (HBCUs)",
  TriballyControlledColleges: "U: Tribally Controlled Colleges and Universities (TCCUs)",
  AlaskaNativeNativeHawaiian: "V: Alaska Native and Native Hawaiian Serving Institutions",
  NonDomesticEntity: "W: Non-domestic (non-US) Entity",
  Other: "X: Other (specify)",
}

/** State review status under Executive Order 12372 */
enum Sf424StateReviewStatus {
  MadeAvailableForReview: "a. This application was made available to the State under the Executive Order 12372 Process for review on",
  SubjectButNotSelected: "b. Program is subject to E.O. 12372 but has not been selected by the State for review",
  NotCovered: "c. Program is not covered by E.O. 12372",
}

/** Yes/No answer */
enum Sf424YesNo {
  Yes: "Yes",
  No: "No",
}

/**
 * SF-424 Application for Federal Assistance (Mandatory Fields).
 *
 * Composes org + contact + AOR sections from the question bank and adds all
 * SF-424-specific mandatory fields (submission type, frequency, applicant type,
 * opportunity info, funding, state review, and certification).
 */
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      otherSubmissionTypeExplanation: #{
        rule: #{
          effect: "HIDE",
          condition: #{ scope: "#/properties/typeOfSubmission", schema: #{ not: #{ type: "string", pattern: "^Other$" } } }
        }
      },
      otherFrequencyExplanation: #{
        rule: #{
          effect: "HIDE",
          condition: #{ scope: "#/properties/frequency", schema: #{ not: #{ type: "string", pattern: "^Other$" } } }
        }
      },
      consolidatedRequestExplanation: #{
        rule: #{
          effect: "HIDE",
          condition: #{ scope: "#/properties/consolidatedRequest", schema: #{ not: #{ type: "string", pattern: "^Yes$" } } }
        }
      }
    }
  }
)
@extension("x-tags", #["sf424-mandatory", "application"])
model SF424Mandatory {
  // == Section 1: Submission metadata ==

  /** 1.a. Type of Submission */
  @example(Sf424SubmissionType.Application)
  typeOfSubmission: Sf424SubmissionType;

  /** Specify the type of submission (required if typeOfSubmission is Other) */
  @example("")
  otherSubmissionTypeExplanation?: string;

  /** 1.b. Frequency */
  @example(Sf424SubmissionType.Application)
  frequency: Sf424SubmissionType;

  /** Specify the frequency of submission (required if frequency is Other) */
  @example("")
  otherFrequencyExplanation?: string;

  /** 1.c. Consolidated Application/Plan/Funding Request? */
  @example(Sf424YesNo.No)
  consolidatedRequest?: Sf424YesNo;

  /** Identify programs covered by the consolidated submission */
  @example("")
  consolidatedRequestExplanation?: string;

  /** 1.d. Version */
  @example(Sf424Version.V1)
  version: Sf424Version;

  /** 2. Date Received — completed by Grants.gov upon submission */
  @format("date")
  @example("2024-03-20")
  dateReceived: string;

  /** 3. Applicant Identifier — optional applicant control number */
  @example("GRANT-2024-001")
  applicantIdentifier?: string;

  /** 4a. Federal Entity Identifier */
  @example("")
  federalEntityId?: string;

  /** 4b. Federal Award Identifier */
  @example("")
  federalAwardId?: string;

  /** 5. Date Received by State */
  @format("date")
  @example("")
  dateReceivedState?: string;

  /** 6. State Application Identifier */
  @example("")
  stateApplicationId?: string;

  // == Section 7: Applicant organization ==

  /** Primary applicant organization name */
  @example(#{ name: "Community Health Initiative" })
  orgName: QuestionOrgName;

  /** Employer Identification Number (EIN) of the applicant organization */
  @example(#{ ein: "12-3456789" })
  orgEin: QuestionOrgEin;

  /** SAM Unique Entity Identifier (UEI) of the applicant organization */
  @example(#{ uei: "ABCD12345678" })
  orgUei: QuestionOrgUei;

  /** Mailing address of the applicant organization */
  @example(#{
    street1: "123 Main Street",
    street2: "Suite 200",
    city: "Springfield",
    state: USState.MO,
    country: "US",
    postalCode: "65804",
  })
  orgAddress: QuestionPrimaryOrgAddress;

  /** County or parish of the applicant address */
  @example("Greene County")
  orgCountyParish?: string;

  /** Primary organizational department or equivalent level */
  @example("Program Development")
  orgDepartmentName?: string;

  /** Primary organizational division or major subdivision */
  @example("Health Services")
  orgDivisionName?: string;

  // == Section 7f: Primary point of contact ==

  /** Primary point of contact name */
  @example(#{
    prefix: NamePrefix.Dr,
    firstName: "Sarah",
    middleName: "Marie",
    lastName: "Johnson",
    suffix: NameSuffix.PhD,
  })
  contactName: QuestionPrimaryContactName;

  /** Primary point of contact title */
  @example(#{ title: "Program Director" })
  contactTitle: QuestionPocTitle;

  /** Contact's organizational affiliation if different from the applicant organization */
  @example("Community Health Initiative")
  contactOrganizationalAffiliation?: string;

  /** Primary point of contact phone number */
  @example(#{ countryCode: "+1", number: "(417) 555-0123" })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        countryCode: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contactPhone/properties/countryCode", schema: #{} }
          }
        },
        extension: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contactPhone/properties/countryCode", schema: #{} }
          }
        },
        isMobile: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contactPhone/properties/countryCode", schema: #{} }
          }
        }
      }
    }
  )
  contactPhone: QuestionPocPhone;

  /** Contact's fax number */
  @example("(417) 555-0124")
  contactFaxNumber?: string;

  /** Primary point of contact email */
  @example(#{ email: "sarah.johnson@communityhealth.org" })
  contactEmail: QuestionPocEmail;

  // == Section 8: Applicant type ==

  /** 8a. Type of Applicant */
  @example(Sf424ApplicantType.NonprofitWith501C3)
  typeOfApplicant: Sf424ApplicantType;

  /** Specify applicant type if Other was selected */
  @example("")
  otherApplicantTypeExplanation?: string;

  /** 8b. Additional description of applicant type */
  @example("")
  additionalDescription?: string;

  // == Sections 9–12: Grant opportunity info ==

  /** 9. Name of Federal Agency — pre-populated from Application cover sheet */
  @example("National Institutes of Health")
  nameOfFederalAgency: string;

  /** 10. Assistance Listing Number — pre-populated from Application cover sheet */
  @example("93.123")
  assistanceListingNumber?: string;

  /** Assistance Listing Title — pre-populated from Application cover sheet */
  @example("Community Health Centers Program")
  assistanceListingTitle?: string;

  /** 11. Descriptive Title of Applicant's Project */
  @example("Community Health Improvement Initiative")
  descriptiveTitleOfApplicantProject: string;

  /** 12. Areas Affected by Funding */
  @example("Rural communities in Southwest Missouri")
  areasAffectedByFunding?: string;

  // == Section 13: Congressional districts ==

  /** 13a. Congressional district of the applicant (format: XX-###, e.g. MO-007) */
  @example("MO-007")
  congressionalDistrictApplicant: string;

  /** 13b. Congressional district(s) of the program/project */
  @example("MO-007")
  congressionalDistrictProject?: string;

  // == Section 14: Funding period ==

  /** 14a. Funding period start date */
  @format("date")
  @example("2024-10-01")
  fundingPeriodStartDate: string;

  /** 14b. Funding period end date */
  @format("date")
  @example("2025-09-30")
  fundingPeriodEndDate: string;

  // == Section 15: Estimated funding ==

  /** 15a. Federal share of estimated funding */
  @example("500000.00")
  estimatedFundingFederal: string;

  /** 15b. Match (non-federal) share of estimated funding */
  @example("125000")
  estimatedFundingMatch?: string;

  // == Section 16: State review ==

  /** 16. Is submission subject to review under Executive Order 12372? */
  @example(Sf424StateReviewStatus.NotCovered)
  submissionSubjectToReview: Sf424StateReviewStatus;

  /** Date the application was made available for state review */
  @format("date")
  @example("")
  stateReviewDate?: string;

  // == Section 17: Federal debt delinquency ==

  /** 17. Is the applicant delinquent on any federal debt? */
  @example(Sf424YesNo.No)
  applicantDelinquentFederalDebt: Sf424YesNo;

  /** Explanation of federal debt delinquency (required if Yes) */
  @example("")
  delinquentFederalDebtExplanation?: string;

  // == Section 18: Authorized Organization Representative ==

  /** AOR agrees to all required certifications */
  @example(true)
  aorIAgree: boolean;

  /** AOR name */
  @example(#{
    prefix: NamePrefix.Mr,
    firstName: "Michael",
    lastName: "Thompson",
    suffix: NameSuffix.PhD,
  })
  aorName: QuestionAorName;

  /** AOR title */
  @example(#{ title: "Executive Director" })
  aorTitle: QuestionAorTitle;

  /** AOR organizational affiliation if different from the applicant organization */
  @example("Community Health Initiative")
  aorOrganizationalAffiliation?: string;

  /** AOR phone number */
  @example(#{ countryCode: "+1", number: "(417) 555-0100" })
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        countryCode: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/aorPhone/properties/countryCode", schema: #{} }
          }
        },
        extension: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/aorPhone/properties/countryCode", schema: #{} }
          }
        },
        isMobile: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/aorPhone/properties/countryCode", schema: #{} }
          }
        }
      }
    }
  )
  aorPhone: QuestionAorPhone;

  /** AOR fax number */
  @example("(417) 555-0101")
  aorFaxNumber?: string;

  /** AOR email */
  @example(#{ email: "michael.thompson@communityhealth.org" })
  aorEmail: QuestionAorEmail;

  /** Signature of Authorized Representative — completed by Grants.gov upon submission */
  @example("Michael Thompson")
  aorSignature: string;

  /** Date the application was signed — completed by Grants.gov upon submission */
  @format("date")
  @example("2024-03-20")
  aorSignatureDate: string;

  // == Supporting documents ==

  /** Attach supporting documents as specified in agency instructions */
  @example("")
  attachSupportingDocuments?: string;
}
