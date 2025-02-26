namespace CommonGrants.Sorting;

/** Information about the sort order of the items returned */
model SortInfo {
  /** The field to sort by */
  @example("lastModifiedAt")
  sortBy: string;

  /** Implementation-defined sort key */
  @example("customField")
  customSortBy?: string;

  /** The order to sort by */
  @example("asc")
  sortOrder?: string;
}
