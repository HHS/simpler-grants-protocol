namespace CommonGrants.Models;

/** The base model for an application to a competition for a funding opportunity */
@example(Examples.Application.applicationBase)
@Versioning.added(CommonGrants.Versions.v0_2)
model ApplicationBase {
  /** The unique identifier for the application */
  id: Types.uuid;

  /** The name of the application */
  name: string;

  /** The unique identifier for the competition */
  competitionId: Types.uuid;

  /** The unique identifier for the opportunity being applied to */
  @Versioning.added(CommonGrants.Versions.v0_3)
  opportunityId: Types.uuid;

  /** The form responses for the application */
  formResponses: Record<AppFormResponse>;

  /** The status of the application */
  status: AppStatus;

  /** The date and time the application was submitted */
  submittedAt?: utcDateTime | null;

  /** The validation errors for the application and form responses */
  validationErrors?: Array<unknown>;

  /** The custom fields about the application */
  customFields?: Record<Fields.CustomField>;

  /** The system metadata for the application */
  ...Fields.SystemMetadata;
}

// #########################################################
// AppStatus
// #########################################################

/** The status of the application */
@example(Examples.Application.submittedStatus)
@Versioning.added(CommonGrants.Versions.v0_2)
model AppStatus {
  /** The status of the application, from a predefined set of options */
  value: AppStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// #########################################################
// AppStatusOptions
// #########################################################

/** The default set of values accepted for application status:
 * - `inProgress`: The application is in progress
 * - `submitted`: The application has been submitted and is being reviewed
 * - `accepted`: The application has been accepted
 * - `rejected`: The application has been rejected
 * - `custom`: A custom status
 */
enum AppStatusOptions {
  inProgress,
  submitted,
  accepted,
  rejected,
  custom,
}

// #########################################################
// ApplicationFormResponse
// #########################################################

/** The model for a form response included in an application */
@example(Examples.Application.formResponse)
@Versioning.added(CommonGrants.Versions.v0_2)
model AppFormResponse {
  /** The unique identifier for the application */
  applicationId: Types.uuid;

  /** Includes all the fields from the FormResponseBase model */
  ...FormResponseBase;
}

// #########################################################
// AppFilters
// #########################################################

/** Filters to apply when searching for applications */
@Versioning.added(CommonGrants.Versions.v0_3)
model AppFilters {
  /** The default filters to apply to the search */
  ...AppDefaultFilters;

  /** Additional implementation-defined filters to apply to the search */
  customFilters?: Record<Filters.DefaultFilter>;
}

/** The standard set of filters supported for application searches */
@Versioning.added(CommonGrants.Versions.v0_3)
model AppDefaultFilters extends Record<Filters.DefaultFilter> {
  /** `opportunityId` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["ad3b469a-d89a-42d3-c439-6c1234567890"],
  })
  opportunityId?: Filters.StringArrayFilter;

  /** `competitionId` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["123e4567-e89b-12d3-a456-426614174000"],
  })
  competitionId?: Filters.StringArrayFilter;

  /** `submittedAt` is between the given range */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: Types.isoDate.fromISO("2025-01-01"),
      max: Types.isoDate.fromISO("2025-01-30"),
    },
  })
  submittedAtRange?: Filters.DateRangeFilter;

  /** `status.value` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["submitted", "accepted"],
  })
  status?: Filters.StringArrayFilter;
}

// #########################################################
// AppSorting
// #########################################################

/** The fields that can be used to sort applications */
@Versioning.added(CommonGrants.Versions.v0_3)
enum AppSortBy {
  lastModifiedAt,
  createdAt,
  submittedAt,
  status: "status.value",
  opportunityId,
  competitionId,
  custom,
}

/** Sorting parameters for applications */
@Versioning.added(CommonGrants.Versions.v0_3)
model AppSorting extends Sorting.SortBodyParams {
  /** The field to sort by */
  @example(AppSortBy.opportunityId)
  sortBy: AppSortBy;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Application {
  const submittedStatus = #{
    value: AppStatusOptions.submitted,
    description: "The application has been submitted.",
  };

  const inProgressStatus = #{
    value: AppStatusOptions.inProgress,
    description: "The application is in progress.",
  };

  const customStatus = #{
    value: AppStatusOptions.custom,
    customValue: "cancelled",
    description: "Application was cancelled before it was submitted.",
  };

  const formResponse = #{
    applicationId: "123e4567-e89b-12d3-a456-426614174000",
    ...Examples.FormResponse.formResponse,
  };

  const attachmentsCustomField = #{
    name: "attachments",
    fieldType: Fields.CustomFieldType.object,
    value: #{
      contacts: Fields.Examples.File.pdfFile,
      budget: Fields.Examples.File.excelFile,
    },
    description: "The attachments for the application",
  };

  const applicationZipFileCustomField = #{
    name: "applicationZipFile",
    fieldType: Fields.CustomFieldType.object,
    value: Fields.Examples.File.zipFile,
    description: "The zip file for the application",
  };

  const applicationBase = #{
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "My Application",
    competitionId: "123e4567-e89b-12d3-a456-426614174000",
    opportunityId: "ad3b469a-d89a-42d3-c439-6c1234567890",
    formResponses: #{ formA: formResponse },
    status: inProgressStatus,
    submittedAt: null,
    createdAt: utcDateTime.fromISO("2021-01-01T00:00:00Z"),
    lastModifiedAt: utcDateTime.fromISO("2021-01-01T00:00:00Z"),
    customFields: #{
      attachments: attachmentsCustomField,
      applicationZipFile: applicationZipFileCustomField,
    },
  };
}
