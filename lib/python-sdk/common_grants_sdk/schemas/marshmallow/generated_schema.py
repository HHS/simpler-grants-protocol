"""Generated Marshmallow schemas for CommonGrants Protocol models."""

from marshmallow import Schema, fields, validate, ValidationError

class CGCommonGrantsBaseModel(Schema):
    """Marshmallow schema for CommonGrantsBaseModel."""
    pass

class CGDecimalStringField(fields.Raw):
    """Marshmallow field for DecimalString."""
    pass

class CGISODateField(fields.Raw):
    """Marshmallow field for ISODate."""
    pass

class CGISOTimeField(fields.Raw):
    """Marshmallow field for ISOTime."""
    pass

class CGUTCDateTimeField(fields.Raw):
    """Marshmallow field for UTCDateTime."""
    pass

class CGCustomField(Schema):
    name = fields.String(metadata={"description": "Name of the custom field"}, allow_none=True)
    field_type = fields.String(metadata={"description": "The JSON schema type to use when de-serializing the `value` field"}, allow_none=True, data_key="fieldType")
    schema_url = fields.Raw(metadata={"description": "Link to the full JSON schema for this custom field"}, allow_none=True, data_key="schema")
    value = fields.Raw(metadata={"description": "Value of the custom field"}, allow_none=True)
    description = fields.String(metadata={"description": "Description of the custom field's purpose"}, allow_none=True)

class CGCustomFieldTypeField(fields.String):
    """Marshmallow field for CustomFieldType enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["string", "number", "integer", "boolean", "object", "array"]), **kwargs)

class CGEventField(fields.Raw):
    """Marshmallow field for Event."""
    pass

class CGMoney(Schema):
    amount = fields.String(metadata={"description": "The amount of money"}, allow_none=True)
    currency = fields.String(metadata={"description": "The ISO 4217 currency code (e.g., 'USD', 'EUR')"}, allow_none=True)

class CGSystemMetadata(Schema):
    created_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was created."}, allow_none=True, data_key="createdAt")
    last_modified_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was last modified."}, allow_none=True, data_key="lastModifiedAt")

class CGArrayOperatorField(fields.String):
    """Marshmallow field for ArrayOperator enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["in", "notIn"]), **kwargs)

class CGComparisonOperatorField(fields.String):
    """Marshmallow field for ComparisonOperator enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["gt", "gte", "lt", "lte"]), **kwargs)

class CGDefaultFilter(Schema):
    operator = fields.Raw(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Raw(metadata={"description": "The value to use for the filter operation"}, allow_none=True)

class CGDateComparisonFilter(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Date(metadata={"description": "The date value to compare against"}, allow_none=True)

class CGDateRange(Schema):
    min = fields.Date(metadata={"description": "The minimum date in the range"}, allow_none=True)
    max = fields.Date(metadata={"description": "The maximum date in the range"}, allow_none=True)

class CGDateRangeFilter(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGDateRange', metadata={"description": "The date range value"}, allow_none=True)

class CGEquivalenceOperatorField(fields.String):
    """Marshmallow field for EquivalenceOperator enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["eq", "neq"]), **kwargs)

class CGInvalidMoneyValueErrorField(fields.Raw):
    """Marshmallow field for InvalidMoneyValueError."""
    pass

class CGMoneyComparisonFilter(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGMoney', metadata={"description": "The money value to compare against"}, allow_none=True)

class CGMoneyRange(Schema):
    min = fields.Nested('CGMoney', metadata={"description": "The minimum amount in the range"}, allow_none=True)
    max = fields.Nested('CGMoney', metadata={"description": "The maximum amount in the range"}, allow_none=True)

class CGMoneyRangeFilter(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.Nested('CGMoneyRange', metadata={"description": "The money range value"}, allow_none=True)

class CGOppDefaultFilters(Schema):
    status = fields.Nested('CGStringArrayFilter', metadata={"description": "`status.value` matches one of the following values"}, allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilter', metadata={"description": "`keyDates.closeDate` is between the given range"}, allow_none=True, data_key="closeDateRange")
    total_funding_available_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.totalAmountAvailable` is between the given range"}, allow_none=True, data_key="totalFundingAvailableRange")
    min_award_amount_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.minAwardAmount` is between the given range"}, allow_none=True, data_key="minAwardAmountRange")
    max_award_amount_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.maxAwardAmount` is between the given range"}, allow_none=True, data_key="maxAwardAmountRange")

class CGOppFilters(Schema):
    status = fields.Nested('CGStringArrayFilter', metadata={"description": "`status.value` matches one of the following values"}, allow_none=True)
    close_date_range = fields.Nested('CGDateRangeFilter', metadata={"description": "`keyDates.closeDate` is between the given range"}, allow_none=True, data_key="closeDateRange")
    total_funding_available_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.totalAmountAvailable` is between the given range"}, allow_none=True, data_key="totalFundingAvailableRange")
    min_award_amount_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.minAwardAmount` is between the given range"}, allow_none=True, data_key="minAwardAmountRange")
    max_award_amount_range = fields.Nested('CGMoneyRangeFilter', metadata={"description": "`funding.maxAwardAmount` is between the given range"}, allow_none=True, data_key="maxAwardAmountRange")
    custom_filters = fields.Raw(metadata={"description": "Additional custom filters to apply to the search"}, allow_none=True, data_key="customFilters")

class CGRangeOperatorField(fields.String):
    """Marshmallow field for RangeOperator enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["between", "outside"]), **kwargs)

class CGStringArrayFilter(Schema):
    operator = fields.String(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.List(fields.String, metadata={"description": "The array of string values"}, allow_none=True)

class CGStringComparisonFilter(Schema):
    operator = fields.Raw(metadata={"description": "The operator to apply to the filter value"}, allow_none=True)
    value = fields.String(metadata={"description": "The string value to compare against"}, allow_none=True)

class CGStringOperatorField(fields.String):
    """Marshmallow field for StringOperator enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["like", "notLike"]), **kwargs)

class CGOppFunding(Schema):
    details = fields.String(metadata={"description": "Details about the funding available for this opportunity that don't fit other fields"}, allow_none=True)
    total_amount_available = fields.Nested('CGMoney', metadata={"description": "Total amount of funding available for this opportunity"}, allow_none=True, data_key="totalAmountAvailable")
    min_award_amount = fields.Nested('CGMoney', metadata={"description": "Minimum amount of funding granted per award"}, allow_none=True, data_key="minAwardAmount")
    max_award_amount = fields.Nested('CGMoney', metadata={"description": "Maximum amount of funding granted per award"}, allow_none=True, data_key="maxAwardAmount")
    min_award_count = fields.Integer(metadata={"description": "Minimum number of awards granted"}, allow_none=True, data_key="minAwardCount")
    max_award_count = fields.Integer(metadata={"description": "Maximum number of awards granted"}, allow_none=True, data_key="maxAwardCount")
    estimated_award_count = fields.Integer(metadata={"description": "Estimated number of awards that will be granted"}, allow_none=True, data_key="estimatedAwardCount")

class CGOpportunityBase(Schema):
    created_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was created."}, allow_none=True, data_key="createdAt")
    last_modified_at = fields.Raw(metadata={"description": "The timestamp (in UTC) at which the record was last modified."}, allow_none=True, data_key="lastModifiedAt")
    id = fields.UUID(metadata={"description": "Globally unique id for the opportunity"}, allow_none=True)
    title = fields.String(metadata={"description": "Title or name of the funding opportunity"}, allow_none=True)
    status = fields.Nested('CGOppStatus', metadata={"description": "Status of the opportunity"}, allow_none=True)
    description = fields.String(metadata={"description": "Description of the opportunity's purpose and scope"}, allow_none=True)
    funding = fields.Nested('CGOppFunding', metadata={"description": "Details about the funding available"}, allow_none=True)
    key_dates = fields.Nested('CGOppTimeline', metadata={"description": "Key dates for the opportunity, such as when the application opens and closes"}, allow_none=True, data_key="keyDates")
    source = fields.Raw(metadata={"description": "URL for the original source of the opportunity"}, allow_none=True)
    custom_fields = fields.Raw(metadata={"description": "Additional custom fields specific to this opportunity"}, allow_none=True, data_key="customFields")

class CGOppStatus(Schema):
    value = fields.String(metadata={"description": "The status value, from a predefined set of options"}, allow_none=True)
    custom_value = fields.String(metadata={"description": "A custom status value"}, allow_none=True, data_key="customValue")
    description = fields.String(metadata={"description": "A human-readable description of the status"}, allow_none=True)

class CGOppStatusOptionsField(fields.String):
    """Marshmallow field for OppStatusOptions enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["forecasted", "open", "custom", "closed"]), **kwargs)

class CGOppTimeline(Schema):
    post_date = fields.Nested('CGSingleDateEvent', metadata={"description": "The date (and time) at which the opportunity is posted"}, allow_none=True, data_key="postDate")
    close_date = fields.Nested('CGSingleDateEvent', metadata={"description": "The date (and time) at which the opportunity closes"}, allow_none=True, data_key="closeDate")
    other_dates = fields.Raw(metadata={"description": "An optional map of other key dates or events in the opportunity timeline"}, allow_none=True, data_key="otherDates")

class CGPaginatedBase(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGPaginatedBodyParams(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGPaginatedQueryParams(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")

class CGPaginatedResultsInfo(Schema):
    page = fields.Integer(metadata={"description": "The page number to retrieve"}, allow_none=True)
    page_size = fields.Integer(metadata={"description": "The number of items per page"}, allow_none=True, data_key="pageSize")
    total_items = fields.Integer(metadata={"description": "The total number of items"}, allow_none=True, data_key="totalItems")
    total_pages = fields.Integer(metadata={"description": "The total number of pages"}, allow_none=True, data_key="totalPages")

class CGOpportunitySearchRequest(Schema):
    search = fields.String(metadata={"description": "Search query string"}, allow_none=True)
    filters = fields.Nested('CGOppFilters', metadata={"description": "Filters to apply to the opportunity search"}, allow_none=True)
    sorting = fields.Nested('CGOppSorting', allow_none=True)
    pagination = fields.Nested('CGPaginatedBodyParams', allow_none=True)

class CGDefaultResponse(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)

class CGError(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "Human-readable error message"}, allow_none=True)
    errors = fields.List(fields.Raw, metadata={"description": "List of errors"}, allow_none=True)

class CGFiltered(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsT'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfo', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfo', metadata={"description": "The sort order of the items"}, allow_none=True, data_key="sortInfo")
    filter_info = fields.Nested('CGFilterInfo', metadata={"description": "The filters applied to the response items"}, allow_none=True, data_key="filterInfo")

class CGFilterInfo(Schema):
    filters = fields.Nested('CGFilterT', metadata={"description": "The filters applied to the response items"}, allow_none=True)
    errors = fields.List(fields.String, metadata={"description": "Non-fatal errors that occurred during filtering"}, allow_none=True)

class CGOpportunitiesListResponse(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBase'), metadata={"description": "The list of opportunities"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfo', metadata={"description": "The pagination details"}, allow_none=True, data_key="paginationInfo")

class CGOpportunitiesSearchResponse(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGOpportunityBase'), metadata={"description": "The list of opportunities"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfo', metadata={"description": "The pagination details"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfo', metadata={"description": "The sorting details"}, allow_none=True, data_key="sortInfo")
    filter_info = fields.Raw(metadata={"description": "The filter details"}, allow_none=True, data_key="filterInfo")

class CGOpportunityResponse(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    data = fields.Nested('CGOpportunityBase', metadata={"description": "The opportunity"}, allow_none=True)

class CGPaginated(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsT'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfo', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")

class CGSorted(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)
    items = fields.List(fields.Nested('CGItemsT'), metadata={"description": "Items from the current page"}, allow_none=True)
    pagination_info = fields.Nested('CGPaginatedResultsInfo', metadata={"description": "Details about the paginated results"}, allow_none=True, data_key="paginationInfo")
    sort_info = fields.Nested('CGSortedResultsInfo', metadata={"description": "The sort order of the items"}, allow_none=True, data_key="sortInfo")

class CGSuccess(Schema):
    status = fields.Integer(metadata={"description": "The HTTP status code"}, allow_none=True)
    message = fields.String(metadata={"description": "The message"}, allow_none=True)

class CGOppSortByField(fields.String):
    """Marshmallow field for OppSortBy enum."""
    def __init__(self, **kwargs):
        super().__init__(validate=validate.OneOf(["lastModifiedAt", "createdAt", "title", "status.value", "keyDates.closeDate", "funding.maxAwardAmount", "funding.minAwardAmount", "funding.totalAmountAvailable", "funding.estimatedAwardCount", "custom"]), **kwargs)

class CGOppSorting(Schema):
    sort_by = fields.String(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    sort_order = fields.String(metadata={"description": "The sort order (asc or desc)"}, allow_none=True, data_key="sortOrder")
    custom_sort_by = fields.String(metadata={"description": "The custom field to sort by when sortBy is 'custom'"}, allow_none=True, data_key="customSortBy")

class CGSortedResultsInfo(Schema):
    sort_by = fields.String(metadata={"description": "The field to sort by"}, allow_none=True, data_key="sortBy")
    custom_sort_by = fields.String(metadata={"description": "Implementation-defined sort key"}, allow_none=True, data_key="customSortBy")
    sort_order = fields.String(metadata={"description": "The order in which the results are sorted"}, allow_none=True, data_key="sortOrder")
    errors = fields.List(fields.String, metadata={"description": "Non-fatal errors that occurred during sorting"}, allow_none=True)

class CGOtherEvent(Schema):
    name = fields.String(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.String(metadata={"description": "Description of what this event represents"}, allow_none=True)
    details = fields.String(metadata={"description": "Details of the event's timeline (e.g. 'Every other Tuesday')"}, allow_none=True)

class CGDateRangeEvent(Schema):
    name = fields.String(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.String(metadata={"description": "Description of what this event represents"}, allow_none=True)
    start_date = fields.Date(metadata={"description": "Start date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True, data_key="startDate")
    start_time = fields.Time(metadata={"description": "Start time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True, data_key="startTime")
    end_date = fields.Date(metadata={"description": "End date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True, data_key="endDate")
    end_time = fields.Time(metadata={"description": "End time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True, data_key="endTime")

class CGSingleDateEvent(Schema):
    name = fields.String(metadata={"description": "Human-readable name of the event (e.g., 'Application posted', 'Question deadline')"}, allow_none=True)
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.String(metadata={"description": "Description of what this event represents"}, allow_none=True)
    date = fields.Date(metadata={"description": "Date of the event in ISO 8601 format: YYYY-MM-DD"}, allow_none=True)
    time = fields.Time(metadata={"description": "Time of the event in ISO 8601 format: HH:MM:SS"}, allow_none=True)
