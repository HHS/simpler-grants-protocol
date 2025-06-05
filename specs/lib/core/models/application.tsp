import "../index.tsp";

namespace CommonGrants.Models;

/** The base model for an application. */
@example(Examples.Application.exampleApplication)
model ApplicationBase {
  /** The application's unique identifier. */
  id: Types.uuid;

  /** The application's status. */
  status?: AppStatus;

  /** The application's date of submission. */
  dateSubmitted?: Types.isoDate;

  /** The organization that is applying for the grant. */
  organization?: OrganizationBase;

  /** The person who is applying for the grant. */
  pointOfContact?: PersonBase;

  /** The application's proposal for funding. */
  proposal?: AppProposal;

  /** The opportunity being applied to. */
  opportunity?: AppOpportunity;

  /** The application's custom fields. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// AppStatus
// #########################################################

/** The status of the application. */
@example(Examples.Application.submittedStatus)
model AppStatus {
  /** The status of the application. */
  value: AppStatusOptions;

  /** A custom value for the status. */
  customValue?: string;

  /** A description of the status. */
  description?: string;
}

// #########################################################
// AppStatusOptions
// #########################################################

/** The default set of values accepted for application status. */
enum AppStatusOptions {
  submitted,
  approved,
  rejected,
  custom,
}

// #########################################################
// AppProject
// #########################################################

/** The project for which funding is requested. */
@example(Examples.Application.exampleProposal)
model AppProposal {
  /** The title of the proposal and/or the project requesting funding. */
  title: string;

  /** The description of the proposal and/or the project requesting funding. */
  description: string;

  /** The amount of money requested. */
  amountRequested?: Fields.Money;

  /** The start date of the period for which the funding is requested. */
  periodStartDate?: Types.isoDate;

  /** The end date of the period for which the funding is requested. */
  periodEndDate?: Types.isoDate;

  /** The project's custom fields. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// AppOpportunity
// #########################################################

/** The opportunity to which this application is related */
model AppOpportunity {
  /** The opportunity's unique identifier. */
  id: Types.uuid;

  /** The opportunity's name. */
  title?: string;

  /** The opportunity's custom fields. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Application {
  const exampleApplication = #{
    id: "083b4567-e89d-42c8-a439-6c1234567890",
    status: submittedStatus,
    dateSubmitted: Types.isoDate.fromISO("2024-01-01"),
    organization: Examples.Organization.exampleOrg,
    pointOfContact: Examples.Person.examplePerson,
    proposal: exampleProposal,
    opportunity: exampleOpportunity,
  };

  const submittedStatus = #{
    value: AppStatusOptions.submitted,
    description: "Application has been submitted.",
  };

  const customStatus = #{
    value: AppStatusOptions.custom,
    customValue: "draft",
    description: "Application is started but not yet submitted.",
  };

  const exampleProposal = #{
    title: "Example Project",
    description: "Example project to serve community needs.",
    amountRequested: #{ amount: "100000", currency: "USD" },
    periodStartDate: Types.isoDate.fromISO("2024-01-01"),
    periodEndDate: Types.isoDate.fromISO("2024-12-31"),
  };

  const exampleOpportunity = #{
    id: "083b4567-e89d-42c8-a439-6c1234567890",
    title: "Example Opportunity",
  };
}
