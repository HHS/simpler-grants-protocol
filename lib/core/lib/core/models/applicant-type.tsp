namespace CommonGrants.Models;

// #########################################################
// ApplicantType
// #########################################################

/** The type of applicant eligible to apply for funding */
@example(Examples.ApplicantType.organization)
@example(Examples.ApplicantType.individual)
@Versioning.added(CommonGrants.Versions.v0_2)
model ApplicantType {
  /** The type of applicant */
  value: ApplicantTypeOptions;

  /** The custom value for the applicant type */
  customValue?: string;

  /** The description of the applicant type */
  description?: string;
}

// #########################################################
// ApplicantTypeOptions
// #########################################################

/** The set of possible applicant types */
@Versioning.added(CommonGrants.Versions.v0_2)
enum ApplicantTypeOptions {
  /** The applicant is an individual */
  individual,

  /** Any type of organization */
  organization,

  /** State government */
  government_state,

  /** County government */
  government_county,

  /** City or township government */
  government_municipal,

  /** Special district government */
  government_special_district,

  /** Federally recognized Native American tribal government */
  government_tribal,

  /** Native American tribal organization that is not federally recognized */
  organization_tribal_other,

  /** Independent school district */
  school_district_independent,

  /** Public or state institution of higher education */
  higher_education_public,

  /** Private institution of higher education */
  higher_education_private,

  /** Non-profit organization with 501(c)(3) status */
  non_profit_with_501c3,

  /** Non-profit organization without 501(c)(3) status */
  nonprofit_without_501c3,

  /** For-profit small business */
  for_profit_small_business,

  /** For-profit organization that is not a small business */
  for_profit_not_small_business,

  /** Anyone can apply (unrestricted) */
  unrestricted,

  /** Custom applicant type */
  custom,
}

// #########################################################
// ApplicantTypeExamples
// #########################################################

/** Examples of applicant types */
namespace Examples.ApplicantType {
  /** The applicant is an individual */
  const individual = #{
    value: ApplicantTypeOptions.individual,
    description: "An individual applicant",
  };

  /** Any type of organization */
  const organization = #{
    value: ApplicantTypeOptions.organization,
    description: "Any type of organization",
  };
}
