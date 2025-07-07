namespace CommonGrants.Models;

/** The base model for a form response */
model FormResponseBase {
  /** The unique identifier for the form response */
  id: Types.uuid;

  /** The unique identifier for the form */
  formId: Types.uuid;

  /** The response to the form */
  response: Record<unknown>;

  /** The status of the form response */
  status: FormResponseStatus;

  /** The validation errors for the form response */
  validationErrors: Array<unknown>;

  /** The system metadata for the form response */
  ...Fields.SystemMetadata;
}

// #########################################################
// FormResponseStatus
// #########################################################

/** The status of the form response */
@example(Examples.FormResponse.inProgressStatus)
model FormResponseStatus {
  /** The status of the form response */
  value: FormResponseStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A description of the status */
  description?: string;
}

// #########################################################
// FormResponseStatusOptions
// #########################################################

/** The options for the status of the form response */
enum FormResponseStatusOptions {
  /** The form response has not been started */
  notStarted,

  /** The form response is in progress */
  inProgress,

  /** The form response is submitted */
  complete,
}

// #########################################################
// Examples
// #########################################################

namespace Examples.FormResponse {
  const inProgressStatus = #{
    value: FormResponseStatusOptions.inProgress,
    description: "The form response is in progress",
  };

  const completeStatus = #{
    value: FormResponseStatusOptions.complete,
    description: "The form response is complete",
  };
}
