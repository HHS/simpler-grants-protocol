"""Generated Marshmallow schemas for CommonGrants Protocol models."""

from marshmallow import Schema, fields

class CGCustomFieldSchema(Schema):
    name = fields.Raw(metadata={"description": "Name of the custom field"}, allow_none=True)
    field_type = fields.String(metadata={"description": "The JSON schema type to use when de-serializing the `value` field"}, allow_none=True, data_key="fieldType")
    schema_url = fields.Raw(metadata={"description": "Link to the full JSON schema for this custom field"}, allow_none=True, data_key="schema")
    value = fields.Raw(metadata={"description": "Value of the custom field"}, allow_none=True)
    description = fields.Raw(metadata={"description": "Description of the custom field's purpose"}, allow_none=True)

class CGDateRangeEventSchema(Schema):
    name = fields.Raw(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.Raw(metadata={"description": "Description of what this event represents"}, allow_none=True)
    start_date = fields.Date(metadata={"description": "Start date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True, data_key="startDate")
    start_time = fields.Time(metadata={"description": "Start time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True, data_key="startTime")
    end_date = fields.Date(metadata={"description": "End date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True, data_key="endDate")
    end_time = fields.Time(metadata={"description": "End time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True, data_key="endTime")

class CGOtherEventSchema(Schema):
    name = fields.Raw(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.Raw(metadata={"description": "Description of what this event represents"}, allow_none=True)
    details = fields.Raw(metadata={"description": "Details of the event's timeline (e.g. 'Every other Tuesday')"}, allow_none=True)

class CGSingleDateEventSchema(Schema):
    name = fields.Raw(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.Raw(metadata={"description": "Description of what this event represents"}, allow_none=True)
    date = fields.Date(metadata={"description": "Date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True)
    time = fields.Time(metadata={"description": "Time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True)

class CGSystemMetadataSchema(Schema):
    created_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was created."}, allow_none=True, data_key="createdAt")
    last_modified_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was last modified."}, allow_none=True, data_key="lastModifiedAt")

class CGDateComparisonFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Date(metadata={"description": "The date value to compare against"}, allow_none=True)

class CGDefaultFilterSchema(Schema):
    operator = fields.Raw(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Raw(metadata={"description": "The value to use for the filter operation"}, allow_none=True)

class CGMoneyComparisonFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGMoneySchema', metadata={"description": "The money value to compare against"}, allow_none=True)

class CGNumberArrayFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.List(fields.Raw, metadata={"description": "The array of numeric values"}, allow_none=True)

class CGNumberComparisonFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The comparison operator to apply to the filter value"}, allow_none=True)
    value = fields.Raw(metadata={"description": "The numeric value to compare against"}, allow_none=True)

class CGNumberRangeFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGNumberRangeSchema', metadata={"description": "The numeric range value"}, allow_none=True)

class CGOppDefaultFiltersSchema(Schema):
    status = fields.Nested('CGStringArrayFilterSchema', metadata={"description": "`status.value` matches one of the following values"}, allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilterSchema', metadata={"description": "`keyDates.closeDate` is between the given range"}, allow_none=True, data_key="closeDateRange")
    total_funding_available_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.totalAmountAvailable` is between the given range"}, allow_none=True, data_key="totalFundingAvailableRange")
    min_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.minAwardAmount` is between the given range"}, allow_none=True, data_key="minAwardAmountRange")
    max_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.maxAwardAmount` is between the given range"}, allow_none=True, data_key="maxAwardAmountRange")

class CGStringComparisonFilterSchema(Schema):
    operator = fields.Raw(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Raw(metadata={"description": "The string value to compare against"}, allow_none=True)

class CGPaginatedBaseSchema(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGPaginatedQueryParamsSchema(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGOpportunitySearchRequestSchema(Schema):
    search = fields.Raw(metadata={"description": "Search query string"}, allow_none=True)
    filters = fields.Nested('CGOppFiltersSchema', metadata={"description": "Filters to apply to the opportunity search"}, allow_none=True)
    sorting = fields.Nested('CGOppSortingSchema', allow_none=True)
    pagination = fields.Nested('CGPaginatedBodyParamsSchema', allow_none=True)

class CGDefaultResponseSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)

class CGErrorSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "Human-readable error message"}, allow_none=True)
    errors = fields.List(fields.Raw, metadata={"description": "List of errors"}, allow_none=True)

class CGFilteredSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfoSchema', metadata={"description": "The sort order of the items"}, allow_none=True, data_key="sortInfo")
    filter_info = fields.Nested('CGFilterInfoSchema', metadata={"description": "The filters applied to the response items"}, allow_none=True, data_key="filterInfo")

class CGOpportunitiesListResponseSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBaseSchema'), metadata={"description": "The list of opportunities"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', metadata={"description": "The pagination details"}, allow_none=True, data_key="paginationInfo")

class CGOpportunitiesSearchResponseSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBaseSchema'), metadata={"description": "The list of opportunities"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', metadata={"description": "The pagination details"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfoSchema', metadata={"description": "The sorting details"}, allow_none=True, data_key="sortInfo")
    filter_info = fields.Raw(metadata={"description": "The filter details"}, allow_none=True, data_key="filterInfo")

class CGOpportunityResponseSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    data = fields.Nested('CGOpportunityBaseSchema', metadata={"description": "The opportunity"}, allow_none=True)

class CGPaginatedSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")

class CGSortedSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsTSchema'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfoSchema', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfoSchema', metadata={"description": "The sort order of the items"}, allow_none=True, data_key="sortInfo")

class CGSuccessSchema(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.Raw(metadata={"description": "The message"}, allow_none=True)

class CGSortBaseSchema(Schema):
    sort_by = fields.Raw(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    custom_sort_by = fields.Raw(metadata={"description": "Implementation-defined sort key"}, allow_none=True, data_key="customSortBy")

class CGSortBodyParamsSchema(Schema):
    sort_by = fields.Raw(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    custom_sort_by = fields.Raw(metadata={"description": "Implementation-defined sort key"}, allow_none=True, data_key="customSortBy")
    sort_order = fields.Nested('CGSortOrderSchema', metadata={"description": "The order to sort by"}, allow_none=True, data_key="sortOrder")

class CGSortQueryParamsSchema(Schema):
    sort_by = fields.Raw(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    custom_sort_by = fields.Raw(metadata={"description": "Implementation-defined sort key"}, allow_none=True, data_key="customSortBy")
    sort_order = fields.Nested('CGSortOrderSchema', metadata={"description": "The order to sort by"}, allow_none=True, data_key="sortOrder")

class CGMoneySchema(Schema):
    amount = fields.Raw(metadata={"description": "The amount of money"}, allow_none=True)
    currency = fields.Raw(metadata={"description": "The ISO 4217 currency code (e.g., 'USD', 'EUR')"}, allow_none=True)

class CGDateRangeSchema(Schema):
    min = fields.Date(metadata={"description": "The minimum date in the range"}, allow_none=True)
    max = fields.Date(metadata={"description": "The maximum date in the range"}, allow_none=True)

class CGNumberRangeSchema(Schema):
    min = fields.Raw(metadata={"description": "The minimum value in the range"}, allow_none=True)
    max = fields.Raw(metadata={"description": "The maximum value in the range"}, allow_none=True)

class CGStringArrayFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.List(fields.Raw, metadata={"description": "The array of string values"}, allow_none=True)

class CGOppStatusSchema(Schema):
    value = fields.String(metadata={"description": "The status value, from a predefined set of options"}, allow_none=True)
    custom_value = fields.Raw(metadata={"description": "A custom status value"}, allow_none=True, data_key="customValue")
    description = fields.Raw(metadata={"description": "A human-readable description of the status"}, allow_none=True)

class CGOppTimelineSchema(Schema):
    post_date = fields.Raw(metadata={"description": "The date (and time) at which the opportunity is posted"}, allow_none=True, data_key="postDate")
    close_date = fields.Raw(metadata={"description": "The date (and time) at which the opportunity closes"}, allow_none=True, data_key="closeDate")
    other_dates = fields.Raw(metadata={"description": "An optional map of other key dates or events in the opportunity timeline"}, allow_none=True, data_key="otherDates")

class CGPaginatedBodyParamsSchema(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGPaginatedResultsInfoSchema(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")
    total_items = fields.Integer(metadata={"description": "The total number of items"}, allow_none=True, data_key="totalItems")
    total_pages = fields.Integer(metadata={"description": "The total number of pages"}, allow_none=True, data_key="totalPages")

class CGFilterInfoSchema(Schema):
    filters = fields.Nested('CGFilterTSchema', metadata={"description": "The filters applied to the response items"}, allow_none=True)
    errors = fields.List(fields.Raw, metadata={"description": "Non-fatal errors that occurred during filtering"}, allow_none=True)

class CGOppSortingSchema(Schema):
    sort_by = fields.String(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    sort_order = fields.Raw(metadata={"description": "The sort order (asc or desc)"}, allow_none=True, data_key="sortOrder")
    custom_sort_by = fields.Raw(metadata={"description": "The custom field to sort by when sortBy is 'custom'"}, allow_none=True, data_key="customSortBy")

class CGSortedResultsInfoSchema(Schema):
    sort_by = fields.Raw(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    custom_sort_by = fields.Raw(metadata={"description": "Implementation-defined sort key"}, allow_none=True, data_key="customSortBy")
    sort_order = fields.Raw(metadata={"description": "The order in which the results are sorted"}, allow_none=True, data_key="sortOrder")
    errors = fields.List(fields.Raw, metadata={"description": "Non-fatal errors that occurred during sorting"}, allow_none=True)

class CGDateRangeFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGDateRangeSchema', metadata={"description": "The date range value"}, allow_none=True)

class CGMoneyRangeSchema(Schema):
    min = fields.Nested('CGMoneySchema', metadata={"description": "The minimum amount in the range"}, allow_none=True)
    max = fields.Nested('CGMoneySchema', metadata={"description": "The maximum amount in the range"}, allow_none=True)

class CGMoneyRangeFilterSchema(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGMoneyRangeSchema', metadata={"description": "The money range value"}, allow_none=True)

class CGOppFiltersSchema(Schema):
    status = fields.Nested('CGStringArrayFilterSchema', metadata={"description": "`status.value` matches one of the following values"}, allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilterSchema', metadata={"description": "`keyDates.closeDate` is between the given range"}, allow_none=True, data_key="closeDateRange")
    total_funding_available_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.totalAmountAvailable` is between the given range"}, allow_none=True, data_key="totalFundingAvailableRange")
    min_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.minAwardAmount` is between the given range"}, allow_none=True, data_key="minAwardAmountRange")
    max_award_amount_range = fields.Nested('CGMoneyRangeFilterSchema', metadata={"description": "`funding.maxAwardAmount` is between the given range"}, allow_none=True, data_key="maxAwardAmountRange")
    custom_filters = fields.Raw(metadata={"description": "Additional custom filters to apply to the search"}, allow_none=True, data_key="customFilters")

class CGOppFundingSchema(Schema):
    details = fields.Raw(metadata={"description": "Details about the funding available for this opportunity that don't fit other fields"}, allow_none=True)
    total_amount_available = fields.Nested('CGMoneySchema', metadata={"description": "Total amount of funding available for this opportunity"}, allow_none=True, data_key="totalAmountAvailable")
    min_award_amount = fields.Nested('CGMoneySchema', metadata={"description": "Minimum amount of funding granted per award"}, allow_none=True, data_key="minAwardAmount")
    max_award_amount = fields.Nested('CGMoneySchema', metadata={"description": "Maximum amount of funding granted per award"}, allow_none=True, data_key="maxAwardAmount")
    min_award_count = fields.Integer(metadata={"description": "Minimum number of awards granted"}, allow_none=True, data_key="minAwardCount")
    max_award_count = fields.Integer(metadata={"description": "Maximum number of awards granted"}, allow_none=True, data_key="maxAwardCount")
    estimated_award_count = fields.Integer(metadata={"description": "Estimated number of awards that will be granted"}, allow_none=True, data_key="estimatedAwardCount")

class CGOpportunityBaseSchema(Schema):
    created_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was created."}, allow_none=True, data_key="createdAt")
    last_modified_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was last modified."}, allow_none=True, data_key="lastModifiedAt")
    id = fields.UUID(metadata={"description": "Globally unique id for the opportunity"}, allow_none=True)
    title = fields.Raw(metadata={"description": "Title or name of the funding opportunity"}, allow_none=True)
    status = fields.Nested('CGOppStatusSchema', metadata={"description": "Status of the opportunity"}, allow_none=True)
    description = fields.Raw(metadata={"description": "Description of the opportunity's purpose and scope"}, allow_none=True)
    funding = fields.Nested('CGOppFundingSchema', metadata={"description": "Details about the funding available"}, allow_none=True)
    key_dates = fields.Nested('CGOppTimelineSchema', metadata={"description": "Key dates for the opportunity, such as when the application opens and closes"}, allow_none=True, data_key="keyDates")
    source = fields.Raw(metadata={"description": "URL for the original source of the opportunity"}, allow_none=True)
    custom_fields = fields.Raw(metadata={"description": "Additional custom fields specific to this opportunity"}, allow_none=True, data_key="customFields")
