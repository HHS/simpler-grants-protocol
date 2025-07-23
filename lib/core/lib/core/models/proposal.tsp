namespace CommonGrants.Models;

// #########################################################
// ProposalBase
// #########################################################

/** A proposal for funding. */
@example(Examples.Proposal.exampleProposal)
@Versioning.added(CommonGrants.Versions.v0_2)
model ProposalBase {
  /** The title of the proposal and/or the project requesting funding. */
  title?: string;

  /** The description of the proposal and/or the project requesting funding. */
  description?: string;

  /** The amount of money requested. */
  amountRequested?: Fields.Money;

  /** The key dates for the project. */
  projectTimeline?: ProjectTimeline;

  /** The opportunity to which this proposal is related */
  opportunity?: ProposalOpportunity;

  /** The organization that is requesting funding. */
  organizations?: ProposalOrgs;

  /** The point of contact for the project. */
  contacts?: ProposalContacts;

  /** The project's custom fields. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// ProposalOpportunity
// #########################################################

/** The opportunity to which this proposal is related */
@Versioning.added(CommonGrants.Versions.v0_2)
model ProposalOpportunity {
  /** The opportunity's unique identifier. */
  id: Types.uuid;

  /** The opportunity's name. */
  title?: string;

  /** The opportunity's custom fields. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// ProjectTimeline
// #########################################################

@Versioning.added(CommonGrants.Versions.v0_2)
model ProjectTimeline {
  /** The start date of the period for which the funding is requested. */
  startDate?: Fields.Event;

  /** The end date of the period for which the funding is requested. */
  endDate?: Fields.Event;

  /** The key dates for the project. */
  otherDates?: Record<Fields.Event>;

  /** Details about the timeline that don't fit into the other fields. */
  timelineDetails?: string;
}

// #########################################################
// ProjectContacts
// #########################################################

@Versioning.added(CommonGrants.Versions.v0_2)
model ProposalContacts {
  /** The primary point of contact for the proposal. */
  primary: PersonBase;

  /** Other points of contact for the proposal. For example, key personnel, authorized representatives, etc. */
  otherContacts?: Record<PersonBase>;
}

// #########################################################
// ProposalOrgs
// #########################################################

@Versioning.added(CommonGrants.Versions.v0_2)
model ProposalOrgs {
  /** The primary organization that is requesting funding. */
  primary: OrganizationBase;

  /** Other organizations that are supporting the proposal. For example, a fiscal sponsor, partners, etc. */
  otherOrgs?: Record<OrganizationBase>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Proposal {
  const exampleProposal = #{
    title: "Example Project",
    description: "Example project to serve community needs.",
    amountRequested: #{ amount: "100000", currency: "USD" },
    opportunity: exampleOpportunity,
    projectTimeline: timeline,
    contacts: contacts,
    organizations: organizations,
  };

  // #####################################
  // Opportunity
  // #####################################

  const exampleOpportunity = #{
    id: "083b4567-e89d-42c8-a439-6c1234567890",
    title: "Example Opportunity",
    customFields: #{ agency: Fields.Examples.CustomField.agency },
  };

  // #####################################
  // ProjectTimeline
  // #####################################

  const timeline = #{
    startDate: #{
      name: "Project Start Date",
      eventType: Fields.EventType.singleDate,
      date: Types.isoDate.fromISO("2025-01-01"),
    },
    endDate: #{
      name: "Project End Date",
      eventType: Fields.EventType.singleDate,
      date: Types.isoDate.fromISO("2025-12-31"),
    },
    otherDates: #{
      evaluationPeriod: #{
        name: "Evaluation Period",
        eventType: Fields.EventType.dateRange,
        startDate: Types.isoDate.fromISO("2025-07-01"),
        endDate: Types.isoDate.fromISO("2025-08-31"),
        description: "The period during which the evaluation will be conducted.",
      },
    },
  };

  // #####################################
  // Contacts
  // #####################################

  const contacts = #{
    primary: Examples.Person.examplePerson,
    otherContacts: #{
      principalInvestigator: #{
        name: #{ prefix: "Dr.", firstName: "Alicia", lastName: "Williams" },
        emails: #{ primary: "alicia.williams@example.com" },
      },
      authorizedRepresentative: #{
        name: #{ firstName: "John", lastName: "Doe" },
        emails: #{ primary: "john.doe@example.com" },
      },
    },
  };

  // #####################################
  // Organizations
  // #####################################

  const organizations = #{
    primary: Examples.Organization.exampleOrg,
    otherOrgs: #{
      fiscalSponsor: Examples.Organization.exampleOrg,
      partner: Examples.Organization.exampleOrg,
    },
  };
}
