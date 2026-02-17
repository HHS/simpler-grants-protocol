import "../../filters/index.tsp";
import "../../sorting.tsp";

namespace CommonGrants.Models;

// ############################################################################
// Filter models
// ############################################################################

/** Filters to apply when searching for opportunities */
@Versioning.added(CommonGrants.Versions.v0_1)
model OppFilters {
  /** The default filters to apply to the search */
  ...OppDefaultFilters;

  /** Additional implementation-defined filters to apply to the search */
  customFilters?: Record<Filters.DefaultFilter>;
}

/** The standard set of filters supported for opportunity searches */
@Versioning.added(CommonGrants.Versions.v0_1)
model OppDefaultFilters extends Record<Filters.DefaultFilter> {
  /** `status.value` matches one of the following values */
  @example(#{
    operator: Filters.ArrayOperators.in,
    value: #["forecasted", "open"],
  })
  status?: Filters.StringArrayFilter;

  /** `keyDates.closeDate` is between the given range */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: Types.isoDate.fromISO("2021-01-01"),
      max: Types.isoDate.fromISO("2021-01-02"),
    },
  })
  closeDateRange?: Filters.DateRangeFilter;

  /** `funding.totalAmountAvailable` is between the given range
   *
   * Funding amounts that are denominated in a different currency will
   * be excluded from the search.
   */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: #{ amount: "1000000", currency: "USD" },
      max: #{ amount: "2000000", currency: "USD" },
    },
  })
  totalFundingAvailableRange?: Filters.MoneyRangeFilter;

  /** `funding.minAwardAmount` is between the given range
   *
   * Funding amounts that are denominated in a different currency will
   * be excluded from the search.
   */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: #{ amount: "1000000", currency: "USD" },
      max: #{ amount: "2000000", currency: "USD" },
    },
  })
  minAwardAmountRange?: Filters.MoneyRangeFilter;

  /** `funding.maxAwardAmount` is between the given range.
   *
   * Funding amounts that are denominated in a different currency will
   * be excluded from the search.
   */
  @example(#{
    operator: Filters.RangeOperators.between,
    value: #{
      min: #{ amount: "1000000", currency: "USD" },
      max: #{ amount: "2000000", currency: "USD" },
    },
  })
  maxAwardAmountRange?: Filters.MoneyRangeFilter;
}

// ############################################################################
// Sorting models
// ############################################################################

@Versioning.added(CommonGrants.Versions.v0_1)
enum OppSortBy {
  lastModifiedAt,
  createdAt,
  title,
  status: "status.value",
  closeDate: "keyDates.closeDate",
  maxAwardAmount: "funding.maxAwardAmount",
  minAwardAmount: "funding.minAwardAmount",
  totalFundingAvailable: "funding.totalAmountAvailable",
  estimatedAwardCount: "funding.estimatedAwardCount",
  custom,
}

@Versioning.added(CommonGrants.Versions.v0_1)
model OppSorting extends Sorting.SortBodyParams {
  /** The field to sort by */
  @example(OppSortBy.lastModifiedAt)
  sortBy: OppSortBy;
}
