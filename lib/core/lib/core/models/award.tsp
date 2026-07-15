import "./opportunity/index.tsp";
import "./application.tsp";
import "./organization.tsp";
import "../fields/index.tsp";
import "../filters/index.tsp";
import "../sorting.tsp";
import "../types.tsp";

namespace CommonGrants.Models;

using Fields;
using Types;

// #########################################################
// AwdStatus
// #########################################################

/** The set of values accepted for award status:
 * - `awarded`: The award has been issued and funds are being disbursed
 * - `completed`: The award's period of performance has ended
 * - `cancelled`: The award was cancelled or terminated
 * - `custom`: A custom status
 */
@Versioning.added(CommonGrants.Versions.v0_4)
enum AwdStatusOptions {
  awarded,
  completed,
  cancelled,
  custom,
}

/** The status of the award */
@example(Examples.Award.customStatus)
@example(Examples.Award.status)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdStatus {
  /** The status of the award, from a predefined set of options */
  value: AwdStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// #########################################################
// AwdFunding
// #########################################################

/** Financial details about the award, including the amounts requested, awarded, and disbursed */
@example(Examples.Award.funding)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdFunding {
  /** Details about the award's funding that don't fit other fields */
  details?: string;

  /** Amount of funding requested by the recipient */
  requestedAmount?: Money;

  /** Amount of funding awarded to the recipient */
  awardedAmount?: Money;

  /** Amount of funding disbursed to the recipient so far */
  disbursedAmount?: Money;
}

// #########################################################
// AwdTimeline
// #########################################################

/** Key dates in the award's timeline, such as the award date and period of performance */
@example(Examples.Award.timeline)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdTimeline {
  /** The date (and time) on which the award was issued */
  awardDate?: Event;

  /** The period during which the funded work is expected to be performed */
  periodOfPerformance?: Event;

  /** An optional map of other key dates or events in the award timeline
   *
   * Examples might include a reporting deadline, close-out date, etc.
   */
  otherDates?: Record<Event>;
}

// #########################################################
// Award identifiers
// #########################################################

/** An award's Federal Award Identification Number (FAIN), assigned by the awarding agency. */
@example(Examples.Award.fain)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdIdFain is Fields.IdentifierT<string, "awd:us:fain">;

/** A collection of identifiers associated with an award.
 *
 * Extends the generic identifier collection with the base identifiers CommonGrants
 * defines for awards. Additional registries can be published under `otherIds`.
 */
@example(Examples.Award.identifiers)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdIds extends Fields.IdentifierCollection {
  /** The award's Federal Award Identification Number (FAIN). */
  `awd:us:fain`?: AwdIdFain;
}

// #########################################################
// AwdRef
// #########################################################

/** A reference to an award, previewing the key fields a consumer needs to
 * identify it and look it up or join it to another response. Appears wherever
 * another record points to an award, such as a parent award for an amendment
 * or tranche.
 */
@example(Examples.Award.ref)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdRef {
  /** Globally unique id for the award */
  @visibility(Lifecycle.Read)
  id: uuid;

  /** Title or name of the award */
  @example("Community Health Center Capital Improvement Grant")
  title: string;

  /** System and registry-specific identifiers for the award */
  identifiers?: AwdIds;
}

// #########################################################
// Award recipient
// #########################################################

/** Whether the award recipient is an organization, an individual, or a custom type.
 * - `organization`: The award was made to an organization
 * - `individual`: The award was made to an individual
 * - `custom`: A custom recipient type
 */
@Versioning.added(CommonGrants.Versions.v0_4)
enum AwdRecipientType {
  organization,
  individual,
  custom,
}

/** An individual who received an award, when the recipient is a person rather than an organization. */
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdRecipientIndividual {
  /** The individual's name. */
  name?: Name;

  /** Identifiers associated with the individual, keyed by registry code. */
  identifiers?: IdentifierCollection;

  /** Custom fields about the individual recipient. */
  customFields?: Record<CustomField>;
}

// #########################################################
// AwardBase
// #########################################################

/** The base model for a grant award.
 *
 * Tracks the funder, recipient, and financial details of a specific grant that
 * resulted from an opportunity and (optionally) an application. It supports
 * customization by extending the `customFields` property.
 */
@doc("A grant award")
@example(Examples.Award.awardBase)
@Versioning.added(CommonGrants.Versions.v0_4)
model AwardBase {
  // Identity fields shared with AwdRef
  ...AwdRef;

  /** Description of the award's purpose */
  @example("Supports facility upgrades at federally qualified health centers.")
  description: string;

  /** Lifecycle status of the award */
  status: AwdStatus;

  /** Requested, awarded, and disbursed amounts */
  funding?: AwdFunding;

  /** Award date and period of performance */
  keyDates?: AwdTimeline;

  /** The opportunity this award resulted from */
  opportunity?: OppRef;

  /** The application this award resulted from */
  application?: AppRef;

  /** Organization(s) that funded the award */
  funders?: OrgRefCollection;

  /** Organization(s) that received the award, if the recipient is an organization */
  recipientOrganizations?: OrgRefCollection;

  /** The individual who received the award, if the recipient is a person */
  recipientIndividual?: AwdRecipientIndividual;

  /** Whether the recipient is an organization, individual, or custom type */
  recipientType?: AwdRecipientType;

  /** Parent award, for amendments or multi-tranche awards */
  parent?: AwdRef;

  /** URL for the canonical source record of the award */
  source?: url;

  // Spreads the fields from the SystemMetadata model into the Award model
  ...SystemMetadata;
}

// #########################################################
// Search: filters
// #########################################################

/** Filters to apply when searching for awards */
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdFilters {
  /** The default filters to apply to the search */
  ...AwdDefaultFilters;

  /** Additional implementation-defined filters to apply to the search */
  customFilters?: Record<Filters.DefaultFilter>;
}

/** The standard set of filters supported for award searches */
@Versioning.added(CommonGrants.Versions.v0_4)
model AwdDefaultFilters extends Record<Filters.DefaultFilter> {
  /** `status.value` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["awarded", "completed"],
  })
  status?: Filters.StringArrayFilter;

  /** `recipientType` matches one of the following values */
  @example(#{ operator: Filters.ArrayOperators.in, value: #["organization"] })
  recipientType?: Filters.StringArrayFilter;

  /** `opportunity.id` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["018f2e77-3a4b-7c1d-9e2f-abcdef123456"],
  })
  opportunityId?: Filters.StringArrayFilter;

  /** `keyDates.awardDate` is between the given range */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: Types.isoDate.fromISO("2026-01-01"),
      max: Types.isoDate.fromISO("2026-12-31"),
    },
  })
  awardDateRange?: Filters.DateRangeFilter;

  /** `funding.awardedAmount` is between the given range
   *
   * Funding amounts that are denominated in a different currency will
   * be excluded from the search.
   */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: #{ amount: "100000", currency: "USD" },
      max: #{ amount: "500000", currency: "USD" },
    },
  })
  awardedAmountRange?: Filters.MoneyRangeFilter;
}

// #########################################################
// Search: sorting
// #########################################################

@Versioning.added(CommonGrants.Versions.v0_4)
enum AwdSortBy {
  lastModifiedAt,
  createdAt,
  title,
  status: "status.value",
  awardDate: "keyDates.awardDate",
  awardedAmount: "funding.awardedAmount",
  custom,
}

@Versioning.added(CommonGrants.Versions.v0_4)
model AwdSorting extends Sorting.SortBodyParams {
  /** The field to sort by */
  @example(AwdSortBy.lastModifiedAt)
  sortBy: AwdSortBy;
}

// #########################################################
// Examples
// #########################################################

/** Examples of the AwardBase model and its sub-models */
namespace Examples.Award {
  const status = #{
    value: AwdStatusOptions.awarded,
    description: "Award has been issued and funds are being disbursed.",
  };

  const customStatus = #{
    value: AwdStatusOptions.custom,
    customValue: "suspended",
    description: "Disbursements are paused pending a compliance review.",
  };

  const funding = #{
    requestedAmount: #{ amount: "500000.00", currency: "USD" },
    awardedAmount: #{ amount: "450000.00", currency: "USD" },
    disbursedAmount: #{ amount: "150000.00", currency: "USD" },
  };

  const timeline = #{
    awardDate: #{
      name: "Award date",
      eventType: EventType.singleDate,
      date: isoDate.fromISO("2026-03-01"),
      description: "The date the award was issued.",
    },
    periodOfPerformance: #{
      name: "Period of performance",
      eventType: EventType.dateRange,
      startDate: isoDate.fromISO("2026-04-01"),
      endDate: isoDate.fromISO("2027-03-31"),
      description: "The period during which the funded work is performed.",
    },
  };

  const fain = #{
    registry: #{
      code: "awd:us:fain",
      url: "https://commongrants.org/registries/awd-us-fain",
    },
    id: "H80CS00001",
  };

  const identifiers = #{
    systemId: #{
      registry: #{ code: "awd:grants.gov:system" },
      id: "01912a8b-7c3d-7894-abcd-ef1234567890",
    },
    `awd:us:fain`: fain,
  };

  const ref = #{
    id: "01912a8b-7c3d-7894-abcd-ef1234567890",
    title: "Community Health Center Capital Improvement Grant",
    identifiers: identifiers,
  };

  const awardBase = #{
    id: "01912a8b-7c3d-7894-abcd-ef1234567890",
    title: "Community Health Center Capital Improvement Grant",
    identifiers: identifiers,
    description: "Supports facility upgrades at federally qualified health centers.",
    status: status,
    funding: funding,
    keyDates: timeline,
    opportunity: Examples.Opportunity.ref,
    funders: Examples.OrgRef.funders,
    recipientOrganizations: Examples.OrgRef.recipients,
    recipientType: AwdRecipientType.organization,
    source: "https://www.usaspending.gov/award/ASST_NON_H80CS00001",
    createdAt: utcDateTime.fromISO("2026-03-01T00:00:00Z"),
    lastModifiedAt: utcDateTime.fromISO("2026-06-01T00:00:00Z"),
  };
}
