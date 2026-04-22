import "@typespec/json-schema";
import "../question-bank/primary-org/org-details.tsp";
import "../question-bank/poc/poc-details.tsp";
import "../question-bank/aor/aor-details.tsp";
import "../question-bank/project/project-details.tsp";

using JsonSchema;
using QuestionBank.OrgDetails;
using QuestionBank.PocDetails;
using QuestionBank.AorDetails;
using QuestionBank.ProjectDetails;
using QuestionBank.QuestionName;
using QuestionBank.QuestionAddress;

namespace Forms.SF424;

/** Type of submission */
enum SubmissionType {
  Preapplication: "Preapplication",
  Application: "Application",
  ChangedCorrectedApplication: "Changed/Corrected Application",
}

/** Type of application */
enum ApplicationType {
  New: "New",
  Continuation: "Continuation",
  Revision: "Revision",
}

/** Revision type (required when applicationType is Revision) */
enum RevisionType {
  IncreaseAward: "A: Increase Award",
  DecreaseAward: "B: Decrease Award",
  IncreaseDuration: "C: Increase Duration",
  DecreaseDuration: "D: Decrease Duration",
  Other: "E: Other (specify)",
  IncreaseAwardIncreaseDuration: "AC: Increase Award, Increase Duration",
  IncreaseAwardDecreaseDuration: "AD: Increase Award, Decrease Duration",
  DecreaseAwardIncreaseDuration: "BC: Decrease Award, Increase Duration",
  DecreaseAwardDecreaseDuration: "BD: Decrease Award, Decrease Duration",
}

/** Applicant type code */
enum ApplicantTypeCode {
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

/**
 * SF-424 Application for Federal Assistance.
 *
 * Composes org + contact + AOR + project details from the question bank,
 * and adds SF-424-specific fields (submission type, applicant type codes,
 * opportunity info, estimated funding, state review, and certification).
 *
 * The legacy hand-written version lives at website/src/content/forms/sf424/.
 * Reviewers compare the two via /forms-new/sf424 vs /forms/sf424 during migration.
 */
@extension("x-tags", #["sf424", "application"])
model SF424 {
  // == Submission metadata ==

  /** Type of submission in accordance with agency instructions */
  @example(SubmissionType.Application)
  submissionType: SubmissionType;

  /** Type of application in accordance with agency instructions */
  @example(ApplicationType.New)
  applicationType: ApplicationType;

  /** Revision type (required if applicationType is Revision) */
  revisionType?: RevisionType;

  /** Revision explanation (required if revisionType is Other) */
  revisionOtherSpecify?: string;

  /** Date received by federal agency — completed by Grants.gov upon submission */
  @format("date")
  @example("2024-03-20")
  dateReceived: string;

  /** Applicant's control number */
  applicantId?: string;

  /** Number assigned to the organization by the Federal agency */
  federalEntityIdentifier?: string;

  /** Previously assigned Federal award identifier (for continuation or revision) */
  federalAwardIdentifier?: string;

  /** Date received by the State */
  @format("date")
  stateReceiveDate?: string;

  /** Identifier assigned by the State */
  stateApplicationId?: string;

  // == Applicant organization ==

  /** Primary applicant organization */
  @example(#{
    name: "Example Research Institute",
    ein: "12-3456789",
    uei: "ABC123DEF456",
    address: #{
      street1: "123 Research Way",
      street2: "Suite 100",
      city: "Washington",
      state: USState.DC,
      country: "US",
      postalCode: "20001",
    },
  })
  org: QuestionOrgDetails;

  /** County or parish of the applicant address */
  @example("District of Columbia")
  applicantCounty?: string;

  /** Province of the applicant address */
  applicantProvince?: string;

  /** Primary organizational department or equivalent level */
  @example("Research Division")
  departmentName?: string;

  /** Primary organizational division or major subdivision */
  @example("Innovation Lab")
  divisionName?: string;

  // == Primary point of contact ==

  /** Primary point of contact */
  @example(#{
    name: #{
      prefix: NamePrefix.Dr,
      firstName: "Jane",
      middleName: "Q",
      lastName: "Smith",
      suffix: NameSuffix.PhD,
    },
    title: "Research Director",
    phone: #{ countryCode: "+1", number: "555-123-4567" },
    email: "jane.smith@example.org",
  })
  contact: QuestionPocDetails;

  /** Contact's fax number */
  @example("555-987-6543")
  contactFax?: string;

  /** Contact's organizational affiliation if different from the applicant organization */
  orgAffiliation?: string;

  // == Applicant type ==

  /** Primary applicant type */
  @example(ApplicantTypeCode.NonprofitWith501C3)
  applicantTypeCode1: ApplicantTypeCode;

  /** Secondary applicant type */
  applicantTypeCode2?: ApplicantTypeCode;

  /** Tertiary applicant type */
  applicantTypeCode3?: ApplicantTypeCode;

  /** Explanation if applicant type is Other (specify) */
  applicantTypeOtherSpecify?: string;

  // == Grant opportunity information ==

  /** Name of the awarding federal agency — pre-populated from Application cover sheet */
  @example("National Science Foundation")
  agencyName: string;

  /** Assistance Listing (CFDA) Number — pre-populated from Application cover sheet */
  @example("47.041")
  cfdaNumber?: string;

  /** Assistance Listing (CFDA) Program Title — pre-populated from Application cover sheet */
  @example("Engineering Grants")
  cfdaProgramTitle?: string;

  /** Funding opportunity number — pre-populated from Application cover sheet */
  @example("NSF-24-123")
  fundingOpportunityNumber: string;

  /** Funding opportunity title — pre-populated from Application cover sheet */
  @example("Innovation in Research Technology")
  fundingOpportunityTitle: string;

  /** Competition identification number — pre-populated from Application cover sheet */
  competitionIdentificationNumber?: string;

  /** Competition identification title — pre-populated from Application cover sheet */
  competitionIdentificationTitle?: string;

  // == Project information ==

  /** Core project details including title and performance period */
  @example(#{
    title: "Advanced Research in Sustainable Technology",
    startDate: "2024-10-01",
    endDate: "2025-09-30",
  })
  project: QuestionProjectDetails;

  /** Areas or entities affected, using categories specified in agency instructions */
  areasAffected?: string;

  /** Additional project titles (attach file) */
  additionalProjectTitle?: string;

  /** Congressional district of the applicant (format: XX-###, e.g. CA-005) */
  @example("DC-000")
  congressionalDistrictApplicant: string;

  /** Congressional district(s) where the program/project will be performed */
  @example("DC-000")
  congressionalDistrictProgramProject: string;

  /** Additional congressional districts if the project spans more than one */
  additionalCongressionalDistricts?: string;

  // == Estimated funding ==

  /** Federal share of estimated funding */
  @example("500000.00")
  federalEstimatedFunding: string;

  /** Applicant share of estimated funding */
  @example("100000.00")
  applicantEstimatedFunding: string;

  /** State share of estimated funding */
  @example("50000.00")
  stateEstimatedFunding: string;

  /** Local share of estimated funding */
  @example("25000.00")
  localEstimatedFunding: string;

  /** Other share of estimated funding */
  @example("25000.00")
  otherEstimatedFunding: string;

  /** Program income share of estimated funding */
  @example("0.00")
  programIncomeEstimatedFunding: string;

  /** Total estimated funding — calculated field */
  @example("700000.00")
  totalEstimatedFunding: string;

  // == State review ==

  /** Is the application subject to review by state executive order 12372? */
  @example("No")
  stateReview: string;

  /** Date the application was made available for state review */
  @format("date")
  stateReviewAvailableDate?: string;

  // == Federal debt delinquency ==

  /** Is the applicant delinquent on any federal debt? */
  @example("No")
  delinquentFederalDebt: string;

  /** Explanation of federal debt delinquency (required if delinquent) */
  debtExplanation?: string;

  // == Certification ==

  /** Applicant agrees to all required certifications */
  @example("Yes")
  certificationAgree: string;

  // == Authorized Organization Representative ==

  /** Authorized Organization Representative */
  @example(#{
    name: #{
      firstName: "Alex",
      lastName: "Johnson",
    },
    title: "Executive Director",
    phone: #{ countryCode: "+1", number: "555-234-5678" },
    email: "director@example.org",
  })
  aor: QuestionAorDetails;

  /** AOR fax number */
  @example("555-876-5432")
  aorFax?: string;

  /** AOR signature — completed by Grants.gov upon submission */
  @example("")
  aorSignature: string;

  /** Date the application was signed — completed by Grants.gov upon submission */
  @format("date")
  @example("2024-03-20")
  dateSigned: string;
}
