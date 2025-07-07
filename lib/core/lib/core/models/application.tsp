namespace CommonGrants.Models;

model ApplicationBase {
  /** The unique identifier for the application */
  id: Types.uuid;

  /** The name of the application */
  name: string;

  /** The unique identifier for the competition */
  competitionId: Types.uuid;

  /** The form responses for the application */
  formResponses: Array<AppFormResponse>;

  /** The status of the application */
  status: AppStatus;

  /** The date and time the application was submitted */
  submittedAt?: utcDateTime | null;

  /** The custom fields about the application */
  customFields?: Record<Fields.CustomField>;

  /** The system metadata for the application */
  ...Fields.SystemMetadata;
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
  /** The application is a draft */
  draft,

  /** The application has been submitted */
  submitted,

  /** The application has been accepted */
  accepted,

  /** The application has been rejected */
  rejected,

  /** The application has a custom status */
  custom,
}

// #########################################################
// ApplicationFormResponse
// #########################################################

model AppFormResponse extends FormResponseBase {
  /** The unique identifier for the application */
  applicationId: Types.uuid;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Application {
  const submittedStatus = #{
    value: AppStatusOptions.submitted,
    description: "The application has been submitted.",
  };

  const customStatus = #{
    value: AppStatusOptions.custom,
    customValue: "draft",
    description: "Application is started but not yet submitted.",
  };
}
