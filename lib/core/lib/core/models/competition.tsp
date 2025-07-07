namespace CommonGrants.Models;

/**
 * The base model for a competition.
 *
 * A competition is an application process for a funding opportunity. It often has a
 * distinct application period and set of application forms.
 */
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
  instructions?: string | Fields.File;

  /** The status of the competition */
  status: CompetitionStatus;

  /** The key dates in the competition timeline */
  keyDates: CompetitionTimeline;

  /** The forms for the competition */
  forms: CompetitionForms;

  /** The custom fields for the competition */
  customFields: Record<Fields.CustomField>;

  /** The system metadata for the competition */
  ...Fields.SystemMetadata;
}

// #########################################################
// CompetitionStatus
// #########################################################

model CompetitionStatus {
  value: CompetitionStatusOptions;
  customValue?: string;
  description?: string;
}

// #########################################################
// CompetitionStatusOptions
// #########################################################

enum CompetitionStatusOptions {
  /** The competition is open for applications */
  open,

  /** The competition is closed for applications */
  closed,

  /** The competition is in a custom status */
  custom,
}

// #########################################################
// CompetitionForm
// #########################################################

model CompetitionForms {
  /** The forms for the competition */
  forms: Record<Models.Form>;

  /** The validation rules for the competition forms */
  validation: Record<unknown>;
}

// #########################################################
// CompetitionTimeline
// #########################################################

model CompetitionTimeline {
  /** The start date of the competition */
  openDate: Fields.Event;

  /** The end date of the competition */
  closeDate: Fields.Event;

  /** The date the competition was created */
  otherDates: Record<Fields.Event>;
}
