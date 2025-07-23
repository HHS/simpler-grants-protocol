namespace CommonGrants.Models;

/**
 * The base model for a competition.
 *
 * A competition is an application process for a funding opportunity. It often has a
 * distinct application period and set of application forms.
 */
@example(Examples.Competition.competition)
@Versioning.added(CommonGrants.Versions.v0_2)
model CompetitionBase {
  /** Globally unique id for the competition */
  id: Types.uuid;

  /** The opportunity id for the competition */
  opportunityId: Types.uuid;

  /** The title of the competition */
  title: string;

  /** The description of the competition */
  description?: string;

  /** The instructions for the competition */
  instructions?: string | Fields.File[];

  /** The status of the competition */
  status: CompetitionStatus;

  /** The key dates in the competition timeline */
  keyDates?: CompetitionTimeline;

  /** The forms for the competition */
  forms: CompetitionForms;

  /** Accepted applicant types for the competition */
  acceptedApplicantTypes?: ApplicantType[];

  /** The custom fields for the competition */
  customFields?: Record<Fields.CustomField>;

  /** The system metadata for the competition */
  ...Fields.SystemMetadata;
}

// #########################################################
// CompetitionStatus
// #########################################################

/** The status of the competition */
@example(Examples.Competition.status)
model CompetitionStatus {
  /** The status of the competition, from a predefined set of options */
  value: CompetitionStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// #########################################################
// CompetitionStatusOptions
// #########################################################

/** The set of values accepted for competition status
 * - `open`: The competition is open for applications
 * - `closed`: The competition is no longer accepting applications
 * - `custom`: A custom status
 */
enum CompetitionStatusOptions {
  open,
  closed,
  custom,
}

// #########################################################
// CompetitionForm
// #########################################################

/** Set of forms that need to be completed to apply to the competition. */
@example(Examples.Competition.forms)
model CompetitionForms {
  /** The forms for the competition */
  forms: Record<Models.Form>;

  /** The validation rules for the competition forms */
  validation?: Record<unknown>;
}

// #########################################################
// CompetitionTimeline
// #########################################################

@example(Examples.Competition.keyDates)
model CompetitionTimeline {
  /** The start date of the competition */
  openDate?: Fields.Event;

  /** The end date of the competition */
  closeDate?: Fields.Event;

  /** The date the competition was created */
  otherDates?: Record<Fields.Event>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Competition {
  const competition = #{
    id: "b7c1e2f4-8a3d-4e2a-9c5b-1f2e3d4c5b6a",
    opportunityId: "b7c1e2f4-8a3d-4e2a-9c5b-1f2e3d4c5b6b",
    title: "Competition 1",
    description: "Competition 1 description",
    instructions: "Competition 1 instructions",
    status: status,
    keyDates: keyDates,
    forms: forms,
    createdAt: utcDateTime.fromISO("2025-01-01T00:00:00Z"),
    lastModifiedAt: utcDateTime.fromISO("2025-01-01T00:00:00Z"),
  };

  const keyDates = #{
    openDate: #{
      name: "Open Date",
      eventType: Fields.EventType.singleDate,
      date: Types.isoDate.fromISO("2025-01-01"),
    },
    closeDate: #{
      name: "Close Date",
      eventType: Fields.EventType.singleDate,
      date: Types.isoDate.fromISO("2025-01-30"),
    },
    otherDates: #{
      reviewPeriod: #{
        name: "Application Review Period",
        eventType: Fields.EventType.dateRange,
        startDate: Types.isoDate.fromISO("2025-02-01"),
        endDate: Types.isoDate.fromISO("2025-02-28"),
      },
    },
  };

  const status = #{
    value: CompetitionStatusOptions.open,
    customValue: "custom",
    description: "Competition is open for applications",
  };

  const forms = #{
    forms: #{ formA: Examples.Form.form, formB: Examples.Form.form },
    validation: #{ required: #["formA", "formB"] },
  };
}
