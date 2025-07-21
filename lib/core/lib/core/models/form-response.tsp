namespace CommonGrants.Models;

/** The base model for a form response */
@example(Examples.FormResponse.formResponse)
model FormResponseBase {
  /** The unique identifier for the form response */
  id: Types.uuid;

  /** The form being responded to */
  formId: Types.uuid;

  /** The response to the form */
  response: Record<unknown>;

  /** The status of the form response */
  status: FormResponseStatus;

  /** The validation errors for the form response */
  validationErrors: Array<unknown>;

  /** Custom attributes about the form response */
  customFields?: Record<Fields.CustomField>;

  /** The system metadata for the form response */
  ...Fields.SystemMetadata;
}

// #########################################################
// FormResponseStatus
// #########################################################

/** The status of the form response */
@example(Examples.FormResponse.inProgressStatus)
model FormResponseStatus {
  /** The status of the form response, from a predefined set of options */
  value: FormResponseStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// #########################################################
// FormResponseStatusOptions
// #########################################################

/** The set of values accepted for form response status:
 * - `notStarted`: The form response has not been started
 * - `inProgress`: The form response is in progress
 * - `complete`: The form response is complete, meaning all required fields have been filled out and there are no validation errors
 * - `custom`: A custom status
 */
enum FormResponseStatusOptions {
  notStarted,
  inProgress,
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

  const formResponse = #{
    id: "123e4567-e89b-12d3-a456-426614174000",
    formId: "123e4567-e89b-12d3-a456-426614174000",
    response: #{
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "123-456-7890",
      address: #{
        street: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip: "12345",
        country: null,
      },
    },
    status: inProgressStatus,
    validationErrors: #[
      #{ field: "address.country", message: "Country is required" }
    ],
    createdAt: utcDateTime.fromISO("2021-01-01T00:00:00Z"),
    lastModifiedAt: utcDateTime.fromISO("2021-01-01T00:00:00Z"),
  };
}
