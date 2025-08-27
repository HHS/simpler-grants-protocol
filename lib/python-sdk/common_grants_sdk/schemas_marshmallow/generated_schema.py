"""Generated Marshmallow schemas for CommonGrants Protocol models."""

from marshmallow import Schema, fields

class CGCustomFieldSchema(Schema):
    name = fields.Raw(description="Name of the custom field", allow_none=True)
    field_type = fields.String(description="The JSON schema type to use when de-serializing the `value` field", data_key="fieldType", allow_none=True)
    schema_url = fields.Raw(description="Link to the full JSON schema for this custom field", data_key="schema", allow_none=True)
    value = fields.Raw(description="Value of the custom field", allow_none=True)
    description = fields.Raw(description="Description of the custom field's purpose", allow_none=True)

class CGDateRangeEventSchema(Schema):
    name = fields.Raw(description="Human-readable name of the event (e.g., 'Application posted', 'Question deadline')", allow_none=True)
    event_type = fields.String(data_key="eventType", allow_none=True)
    description = fields.Raw(description="Description of what this event represents", allow_none=True)
    start_date = fields.Date(description="Start date of the event in ISO 8601 format: YYYY-MM-DD", data_key="startDate", allow_none=True)
    start_time = fields.Time(description="Start time of the event in ISO 8601 format: HH:MM:SS", data_key="startTime", allow_none=True)
    end_date = fields.Date(description="End date of the event in ISO 8601 format: YYYY-MM-DD", data_key="endDate", allow_none=True)
    end_time = fields.Time(description="End time of the event in ISO 8601 format: HH:MM:SS", data_key="endTime", allow_none=True)

class CGOtherEventSchema(Schema):
    name = fields.Raw(description="Human-readable name of the event (e.g., 'Application posted', 'Question deadline')", allow_none=True)
    event_type = fields.String(data_key="eventType", allow_none=True)
    description = fields.Raw(description="Description of what this event represents", allow_none=True)
    details = fields.Raw(description="Details of the event's timeline (e.g. 'Every other Tuesday')", allow_none=True)

class CGSingleDateEventSchema(Schema):
    name = fields.Raw(description="Human-readable name of the event (e.g., 'Application posted', 'Question deadline')", allow_none=True)
    event_type = fields.String(data_key="eventType", allow_none=True)
    description = fields.Raw(description="Description of what this event represents", allow_none=True)
    date = fields.Date(description="Date of the event in ISO 8601 format: YYYY-MM-DD", allow_none=True)
    time = fields.Time(description="Time of the event in ISO 8601 format: HH:MM:SS", allow_none=True)

class CGSystemMetadataSchema(Schema):
    created_at = fields.Raw(description="The timestamp (in UTC) at which the record was created.", data_key="createdAt", allow_none=True)
    last_modified_at = fields.Raw(description="The timestamp (in UTC) at which the record was last modified.", data_key="lastModifiedAt", allow_none=True)

class CGDateComparisonFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Date(description="The date value to compare against", allow_none=True)

class CGDefaultFilterSchema(Schema):
    operator = fields.Raw(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Raw(description="The value to use for the filter operation", allow_none=True)

class CGMoneyComparisonFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Nested('CGMoneySchema', description="The money value to compare against", allow_none=True)

class CGNumberArrayFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.List(fields.Raw, description="The array of numeric values", allow_none=True)

class CGNumberComparisonFilterSchema(Schema):
    operator = fields.String(description="The comparison operator to apply to the filter value", allow_none=True)
    value = fields.Raw(description="The numeric value to compare against", allow_none=True)

class CGNumberRangeFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Nested('CGNumberRangeSchema', description="The numeric range value", allow_none=True)

class CGOppDefaultFiltersSchema(Schema):
    status = fields.Nested('CGStringArrayFilterSchema', description="`status.value` matches one of the following values", allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilterSchema', description="`keyDates.closeDate` is between the given range", data_key="closeDateRange", allow_none=True)
    total_funding_available_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.totalAmountAvailable` is between the given range", data_key="totalFundingAvailableRange", allow_none=True)
    min_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.minAwardAmount` is between the given range", data_key="minAwardAmountRange", allow_none=True)
    max_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.maxAwardAmount` is between the given range", data_key="maxAwardAmountRange", allow_none=True)

class CGStringComparisonFilterSchema(Schema):
    operator = fields.Raw(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Raw(description="The string value to compare against", allow_none=True)

class CGPaginatedBaseSchema(Schema):
    page = fields.Integer(description="The page number to retrieve", allow_none=True)
    page_size = fields.Integer(description="The number of items per page", data_key="pageSize", allow_none=True)

class CGPaginatedQueryParamsSchema(Schema):
    page = fields.Integer(description="The page number to retrieve", allow_none=True)
    page_size = fields.Integer(description="The number of items per page", data_key="pageSize", allow_none=True)

class CGOpportunitySearchRequestSchema(Schema):
    search = fields.Raw(description="Search query string", allow_none=True)
    filters = fields.Nested('CGOppFiltersSchema', description="Filters to apply to the opportunity search", allow_none=True)
    sorting = fields.Nested('CGOppSortingSchema', allow_none=True)
    pagination = fields.Nested('CGPaginatedBodyParamsSchema', allow_none=True)

class CGDefaultResponseSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)

class CGErrorSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="Human-readable error message", allow_none=True)
    errors = fields.List(fields.Raw, description="List of errors", allow_none=True)

class CGFilteredSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), description="Items from the current page", allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', description="Details about the paginated results", data_key="paginationInfo", allow_none=True)
    sort_info = fields.Nested('CGSortedResultsInfoSchema', description="The sort order of the items", data_key="sortInfo", allow_none=True)
    filter_info = fields.Nested('CGFilterInfoSchema', description="The filters applied to the response items", data_key="filterInfo", allow_none=True)

class CGOpportunitiesListResponseSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBaseSchema'), description="The list of opportunities", allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', description="The pagination details", data_key="paginationInfo", allow_none=True)

class CGOpportunitiesSearchResponseSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBaseSchema'), description="The list of opportunities", allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', description="The pagination details", data_key="paginationInfo", allow_none=True)
    sort_info = fields.Nested('CGSortedResultsInfoSchema', description="The sorting details", data_key="sortInfo", allow_none=True)
    filter_info = fields.Raw(description="The filter details", data_key="filterInfo", allow_none=True)

class CGOpportunityResponseSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    data = fields.Nested('CGOpportunityBaseSchema', description="The opportunity", allow_none=True)

class CGPaginatedSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), description="Items from the current page", allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', description="Details about the paginated results", data_key="paginationInfo", allow_none=True)

class CGSortedSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), description="Items from the current page", allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', description="Details about the paginated results", data_key="paginationInfo", allow_none=True)
    sort_info = fields.Nested('CGSortedResultsInfoSchema', description="The sort order of the items", data_key="sortInfo", allow_none=True)

class CGSuccessSchema(Schema):
    status = fields.Integer(description="The HTTP status code", allow_none=True)
    message = fields.Raw(description="The message", allow_none=True)

class CGSortBaseSchema(Schema):
    sort_by = fields.Raw(description="The field to sort by", data_key="sortBy", allow_none=True)
    custom_sort_by = fields.Raw(description="Implementation-defined sort key", data_key="customSortBy", allow_none=True)

class CGSortBodyParamsSchema(Schema):
    sort_by = fields.Raw(description="The field to sort by", data_key="sortBy", allow_none=True)
    custom_sort_by = fields.Raw(description="Implementation-defined sort key", data_key="customSortBy", allow_none=True)
    sort_order = fields.Nested('CGSortOrderSchema', description="The order to sort by", data_key="sortOrder", allow_none=True)

class CGSortQueryParamsSchema(Schema):
    sort_by = fields.Raw(description="The field to sort by", data_key="sortBy", allow_none=True)
    custom_sort_by = fields.Raw(description="Implementation-defined sort key", data_key="customSortBy", allow_none=True)
    sort_order = fields.Nested('CGSortOrderSchema', description="The order to sort by", data_key="sortOrder", allow_none=True)

class CGMoneySchema(Schema):
    amount = fields.Raw(description="The amount of money", allow_none=True)
    currency = fields.Raw(description="The ISO 4217 currency code (e.g., 'USD', 'EUR')", allow_none=True)

class CGDateRangeSchema(Schema):
    min = fields.Date(description="The minimum date in the range", allow_none=True)
    max = fields.Date(description="The maximum date in the range", allow_none=True)

class CGNumberRangeSchema(Schema):
    min = fields.Raw(description="The minimum value in the range", allow_none=True)
    max = fields.Raw(description="The maximum value in the range", allow_none=True)

class CGStringArrayFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.List(fields.Raw, description="The array of string values", allow_none=True)

class CGOppStatusSchema(Schema):
    value = fields.String(description="The status value, from a predefined set of options", allow_none=True)
    custom_value = fields.Raw(description="A custom status value", data_key="customValue", allow_none=True)
    description = fields.Raw(description="A human-readable description of the status", allow_none=True)

class CGOppTimelineSchema(Schema):
    post_date = fields.Raw(description="The date (and time) at which the opportunity is posted", data_key="postDate", allow_none=True)
    close_date = fields.Raw(description="The date (and time) at which the opportunity closes", data_key="closeDate", allow_none=True)
    other_dates = fields.Raw(description="An optional map of other key dates or events in the opportunity timeline", data_key="otherDates", allow_none=True)

class CGPaginatedBodyParamsSchema(Schema):
    page = fields.Integer(description="The page number to retrieve", allow_none=True)
    page_size = fields.Integer(description="The number of items per page", data_key="pageSize", allow_none=True)

class CGPaginatedResultsInfoSchema(Schema):
    page = fields.Integer(description="The page number to retrieve", allow_none=True)
    page_size = fields.Integer(description="The number of items per page", data_key="pageSize", allow_none=True)
    total_items = fields.Integer(description="The total number of items", data_key="totalItems", allow_none=True)
    total_pages = fields.Integer(description="The total number of pages", data_key="totalPages", allow_none=True)

class CGFilterInfoSchema(Schema):
    filters = fields.Nested('CGFilterTSchema', description="The filters applied to the response items", allow_none=True)
    errors = fields.List(fields.Raw, description="Non-fatal errors that occurred during filtering", allow_none=True)

class CGOppSortingSchema(Schema):
    sort_by = fields.String(description="The field to sort by", data_key="sortBy", allow_none=True)
    sort_order = fields.Raw(description="The sort order (asc or desc)", data_key="sortOrder", allow_none=True)
    custom_sort_by = fields.Raw(description="The custom field to sort by when sortBy is 'custom'", data_key="customSortBy", allow_none=True)

class CGSortedResultsInfoSchema(Schema):
    sort_by = fields.Raw(description="The field to sort by", data_key="sortBy", allow_none=True)
    custom_sort_by = fields.Raw(description="Implementation-defined sort key", data_key="customSortBy", allow_none=True)
    sort_order = fields.Raw(description="The order in which the results are sorted", data_key="sortOrder", allow_none=True)
    errors = fields.List(fields.Raw, description="Non-fatal errors that occurred during sorting", allow_none=True)

class CGDateRangeFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Nested('CGDateRangeSchema', description="The date range value", allow_none=True)

class CGMoneyRangeSchema(Schema):
    min = fields.Nested('CGMoneySchema', description="The minimum amount in the range", allow_none=True)
    max = fields.Nested('CGMoneySchema', description="The maximum amount in the range", allow_none=True)

class CGMoneyRangeFilterSchema(Schema):
    operator = fields.String(description="The operator to apply to the filter value", allow_none=True)
    value = fields.Nested('CGMoneyRangeSchema', description="The money range value", allow_none=True)

class CGOppFiltersSchema(Schema):
    status = fields.Nested('CGStringArrayFilterSchema', description="`status.value` matches one of the following values", allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilterSchema', description="`keyDates.closeDate` is between the given range", data_key="closeDateRange", allow_none=True)
    total_funding_available_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.totalAmountAvailable` is between the given range", data_key="totalFundingAvailableRange", allow_none=True)
    min_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.minAwardAmount` is between the given range", data_key="minAwardAmountRange", allow_none=True)
    max_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', description="`funding.maxAwardAmount` is between the given range", data_key="maxAwardAmountRange", allow_none=True)
    custom_filters = fields.Raw(description="Additional custom filters to apply to the search", data_key="customFilters", allow_none=True)

class CGOppFundingSchema(Schema):
    details = fields.Raw(description="Details about the funding available for this opportunity that don't fit other fields", allow_none=True)
    total_amount_available = fields.Nested('CGMoneySchema', description="Total amount of funding available for this opportunity", data_key="totalAmountAvailable", allow_none=True)
    min_award_amount = fields.Nested('CGMoneySchema', description="Minimum amount of funding granted per award", data_key="minAwardAmount", allow_none=True)
    max_award_amount = fields.Nested('CGMoneySchema', description="Maximum amount of funding granted per award", data_key="maxAwardAmount", allow_none=True)
    min_award_count = fields.Integer(description="Minimum number of awards granted", data_key="minAwardCount", allow_none=True)
    max_award_count = fields.Integer(description="Maximum number of awards granted", data_key="maxAwardCount", allow_none=True)
    estimated_award_count = fields.Integer(description="Estimated number of awards that will be granted", data_key="estimatedAwardCount", allow_none=True)

class CGOpportunityBaseSchema(Schema):
    created_at = fields.Raw(description="The timestamp (in UTC) at which the record was created.", data_key="createdAt", allow_none=True)
    last_modified_at = fields.Raw(description="The timestamp (in UTC) at which the record was last modified.", data_key="lastModifiedAt", allow_none=True)
    id = fields.UUID(description="Globally unique id for the opportunity", allow_none=True)
    title = fields.Raw(description="Title or name of the funding opportunity", allow_none=True)
    status = fields.Nested('CGOppStatusSchema', description="Status of the opportunity", allow_none=True)
    description = fields.Raw(description="Description of the opportunity's purpose and scope", allow_none=True)
    funding = fields.Nested('CGOppFundingSchema', description="Details about the funding available", allow_none=True)
    key_dates = fields.Nested('CGOppTimelineSchema', description="Key dates for the opportunity, such as when the application opens and closes", data_key="keyDates", allow_none=True)
    source = fields.Raw(description="URL for the original source of the opportunity", allow_none=True)
    custom_fields = fields.Raw(description="Additional custom fields specific to this opportunity", data_key="customFields", allow_none=True)
