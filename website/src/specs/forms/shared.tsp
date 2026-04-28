import "@typespec/json-schema";

using JsonSchema;

namespace Forms.Shared;

/** Yes/No answer */
enum YesNo {
  Yes: "Yes",
  No: "No",
}

/** Frequency of submission — shared across SF-424 forms */
enum FrequencyType {
  Annual: "Annual",
  Quarterly: "Quarterly",
  Other: "Other",
}

/** Type of submission — shared across SF-424 forms */
enum SubmissionType {
  Application: "Application",
  Preapplication: "Preapplication",
  ChangedCorrectedApplication: "Changed/Corrected Application",
  ChangedCorrectedPreapplication: "Changed/Corrected Preapplication",
  Other: "Other",
}

/** Fax number string — max 25 chars */
@minLength(0)
@maxLength(25)
scalar FaxNumber extends string;

/** Organizational affiliation string — max 60 chars */
@minLength(0)
@maxLength(60)
scalar OrgAffiliation extends string;

/** Congressional district string (format: XX-###) */
@minLength(1)
@maxLength(6)
scalar CongressionalDistrict extends string;

/** Applicant type code — shared across SF-424 forms */
enum ApplicantTypeCode {
  None: "None",
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
