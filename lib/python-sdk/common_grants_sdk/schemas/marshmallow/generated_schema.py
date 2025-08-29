"""Manual Marshmallow schemas for CommonGrants Protocol models.

These schemas are manually created to avoid naming conflicts and provide
proper OpenAPI generation for the simpler-grants-gov API.
"""

from marshmallow import Schema, fields, validate


# Basic field types
class Money(Schema):
    """Represents a monetary amount in a specific currency."""

    amount = fields.String(required=True, metadata={"description": "The amount of money"})
    currency = fields.String(
        required=True, metadata={"description": "The ISO 4217 currency code (e.g., 'USD', 'EUR')"}
    )


class SingleDateEvent(Schema):
    """Represents a single date event."""

    name = fields.String(
        allow_none=True, metadata={"description": "Human-readable name of the event"}
    )
    event_type = fields.String(allow_none=True, data_key="eventType")
    description = fields.String(
        allow_none=True, metadata={"description": "Description of what this event represents"}
    )
    date = fields.Date(
        allow_none=True, metadata={"description": "Date of the event in ISO 8601 format: YYYY-MM-DD"}
    )
    time = fields.Time(
        allow_none=True, metadata={"description": "Time of the event in ISO 8601 format: HH:MM:SS"}
    )


class DateRange(Schema):
    """Range filter for date values."""

    min = fields.Date(allow_none=True, metadata={"description": "The minimum date in the range"})
    max = fields.Date(allow_none=True, metadata={"description": "The maximum date in the range"})


class MoneyRange(Schema):
    """Range filter for money values."""

    min = fields.Nested(
        Money, allow_none=True, metadata={"description": "The minimum amount in the range"}
    )
    max = fields.Nested(
        Money, allow_none=True, metadata={"description": "The maximum amount in the range"}
    )


# Filter schemas
class StringArrayFilter(Schema):
    """Filter for string arrays."""

    operator = fields.String(
        allow_none=True, metadata={"description": "The operator to apply to the filter value"}
    )
    value = fields.List(
        fields.String, allow_none=True, metadata={"description": "The array of string values"}
    )


class DateRangeFilter(Schema):
    """Filter for date ranges."""

    operator = fields.String(
        allow_none=True, metadata={"description": "The operator to apply to the filter value"}
    )
    value = fields.Nested(
        DateRange, allow_none=True, metadata={"description": "The date range value"}
    )


class MoneyRangeFilter(Schema):
    """Filter for money ranges."""

    operator = fields.String(
        allow_none=True, metadata={"description": "The operator to apply to the filter value"}
    )
    value = fields.Nested(
        MoneyRange, allow_none=True, metadata={"description": "The money range value"}
    )


class OppFilters(Schema):
    """Filters for opportunity search."""

    status = fields.Nested(
        StringArrayFilter,
        allow_none=True,
        metadata={"description": "`status.value` matches one of the following values"},
    )
    close_date_range = fields.Nested(
        DateRangeFilter,
        allow_none=True,
        data_key="closeDateRange",
        metadata={"description": "`keyDates.closeDate` is between the given range"},
    )
    total_funding_available_range = fields.Nested(
        MoneyRangeFilter,
        allow_none=True,
        data_key="totalFundingAvailableRange",
        metadata={"description": "`funding.totalAmountAvailable` is between the given range"},
    )
    min_award_amount_range = fields.Nested(
        MoneyRangeFilter,
        allow_none=True,
        data_key="minAwardAmountRange",
        metadata={"description": "`funding.minAwardAmount` is between the given range"},
    )
    max_award_amount_range = fields.Nested(
        MoneyRangeFilter,
        allow_none=True,
        data_key="maxAwardAmountRange",
        metadata={"description": "`funding.maxAwardAmount` is between the given range"},
    )
    custom_filters = fields.Raw(
        allow_none=True,
        data_key="customFilters",
        metadata={"description": "Additional custom filters to apply to the search"},
    )


# Core opportunity schemas
class OppStatus(Schema):
    """Status of an opportunity."""

    value = fields.String(
        allow_none=True,
        metadata={"description": "The status value, from a predefined set of options"},
    )
    custom_value = fields.String(
        allow_none=True, data_key="customValue", metadata={"description": "A custom status value"}
    )
    description = fields.String(
        allow_none=True, metadata={"description": "A human-readable description of the status"}
    )


class OppFunding(Schema):
    """Funding details for an opportunity."""

    details = fields.String(
        allow_none=True,
        metadata={"description": "Details about the funding available for this opportunity that don't fit other fields"},
    )
    total_amount_available = fields.Nested(
        Money,
        allow_none=True,
        data_key="totalAmountAvailable",
        metadata={"description": "Total amount of funding available for this opportunity"},
    )
    min_award_amount = fields.Nested(
        Money,
        allow_none=True,
        data_key="minAwardAmount",
        metadata={"description": "Minimum amount of funding granted per award"},
    )
    max_award_amount = fields.Nested(
        Money,
        allow_none=True,
        data_key="maxAwardAmount",
        metadata={"description": "Maximum amount of funding granted per award"},
    )
    min_award_count = fields.Integer(
        allow_none=True,
        data_key="minAwardCount",
        metadata={"description": "Minimum number of awards granted"},
    )
    max_award_count = fields.Integer(
        allow_none=True,
        data_key="maxAwardCount",
        metadata={"description": "Maximum number of awards granted"},
    )
    estimated_award_count = fields.Integer(
        allow_none=True,
        data_key="estimatedAwardCount",
        metadata={"description": "Estimated number of awards that will be granted"},
    )


class OppTimeline(Schema):
    """Timeline for an opportunity."""

    post_date = fields.Nested(
        SingleDateEvent,
        allow_none=True,
        data_key="postDate",
        metadata={"description": "The date (and time) at which the opportunity is posted"},
    )
    close_date = fields.Nested(
        SingleDateEvent,
        allow_none=True,
        data_key="closeDate",
        metadata={"description": "The date (and time) at which the opportunity closes"},
    )
    other_dates = fields.Raw(
        allow_none=True,
        data_key="otherDates",
        metadata={"description": "An optional map of other key dates or events in the opportunity timeline"},
    )


class OpportunityBase(Schema):
    """Base opportunity model."""

    created_at = fields.Raw(
        allow_none=True,
        data_key="createdAt",
        metadata={"description": "The timestamp (in UTC) at which the record was created."},
    )
    last_modified_at = fields.Raw(
        allow_none=True,
        data_key="lastModifiedAt",
        metadata={"description": "The timestamp (in UTC) at which the record was last modified."},
    )
    id = fields.UUID(
        allow_none=True, metadata={"description": "Globally unique id for the opportunity"}
    )
    title = fields.String(
        allow_none=True, metadata={"description": "Title or name of the funding opportunity"}
    )
    status = fields.Nested(
        OppStatus, allow_none=True, metadata={"description": "Status of the opportunity"}
    )
    description = fields.String(
        allow_none=True,
        metadata={"description": "Description of the opportunity's purpose and scope"},
    )
    funding = fields.Nested(
        OppFunding, allow_none=True, metadata={"description": "Details about the funding available"}
    )
    key_dates = fields.Nested(
        OppTimeline,
        allow_none=True,
        data_key="keyDates",
        metadata={"description": "Key dates for the opportunity, such as when the application opens and closes"},
    )
    source = fields.Raw(
        allow_none=True, metadata={"description": "URL for the original source of the opportunity"}
    )
    custom_fields = fields.Raw(
        allow_none=True,
        data_key="customFields",
        metadata={"description": "Additional custom fields specific to this opportunity"},
    )


# Pagination schemas
class PaginatedBodyParams(Schema):
    """Parameters for pagination in the body of a request."""

    page = fields.Integer(allow_none=True, metadata={"description": "The page number to retrieve"})
    page_size = fields.Integer(
        allow_none=True, data_key="pageSize", metadata={"description": "The number of items per page"}
    )


class PaginatedQueryParams(Schema):
    """Parameters for pagination in query parameters."""

    page = fields.Integer(allow_none=True, metadata={"description": "The page number to retrieve"})
    page_size = fields.Integer(
        allow_none=True, data_key="pageSize", metadata={"description": "The number of items per page"}
    )


class PaginatedResultsInfo(Schema):
    """Information about the pagination of a list."""

    page = fields.Integer(allow_none=True, metadata={"description": "The page number to retrieve"})
    page_size = fields.Integer(
        allow_none=True, data_key="pageSize", metadata={"description": "The number of items per page"}
    )
    total_items = fields.Integer(
        required=True, data_key="totalItems", metadata={"description": "The total number of items"}
    )
    total_pages = fields.Integer(
        required=True, data_key="totalPages", metadata={"description": "The total number of pages"}
    )


# Sorting schemas
class OppSortBy(fields.String):
    """Enum field for opportunity sort by options."""

    def __init__(self, **kwargs):
        super().__init__(
            validate=validate.OneOf(
                [
                    "lastModifiedAt",
                    "createdAt",
                    "title",
                    "status.value",
                    "keyDates.closeDate",
                    "funding.maxAwardAmount",
                    "funding.minAwardAmount",
                    "funding.totalAmountAvailable",
                    "funding.estimatedAwardCount",
                    "custom",
                ]
            ),
            metadata={"description": "The field to sort by"},
            **kwargs
        )


class OppSorting(Schema):
    """Sorting parameters for opportunities."""

    sort_by = OppSortBy(
        required=True, data_key="sortBy"
    )
    sort_order = fields.String(
        allow_none=True,
        data_key="sortOrder",
        metadata={"description": "The sort order (asc or desc)"},
    )
    custom_sort_by = fields.String(
        allow_none=True,
        data_key="customSortBy",
        metadata={"description": "The custom field to sort by when sortBy is 'custom'"},
    )


class SortedResultsInfo(Schema):
    """Information about sorting results."""

    sort_by = fields.String(
        required=True, data_key="sortBy", metadata={"description": "The field to sort by"}
    )
    custom_sort_by = fields.String(
        allow_none=True,
        data_key="customSortBy",
        metadata={"description": "Implementation-defined sort key"},
    )
    sort_order = fields.String(
        required=True,
        data_key="sortOrder",
        metadata={"description": "The order in which the results are sorted"},
    )
    errors = fields.List(
        fields.String,
        allow_none=True,
        metadata={"description": "Non-fatal errors that occurred during sorting"},
    )


# Filter info schema
class FilterInfo(Schema):
    """Information about applied filters."""

    filters = fields.Raw(
        required=True, metadata={"description": "The filters applied to the response items"}
    )
    errors = fields.List(
        fields.String,
        allow_none=True,
        metadata={"description": "Non-fatal errors that occurred during filtering"},
    )


# Request schemas
class OpportunitySearchRequest(Schema):
    """Request schema for searching opportunities."""

    search = fields.String(allow_none=True, metadata={"description": "Search query string"})
    filters = fields.Nested(
        OppFilters,
        allow_none=True,
        metadata={"description": "Filters to apply to the opportunity search"},
    )
    sorting = fields.Nested(
        OppSorting, allow_none=True, metadata={"description": "Sorting parameters for opportunities"}
    )
    pagination = fields.Nested(PaginatedBodyParams, allow_none=True)


# Response schemas
class OpportunitiesListResponse(Schema):
    """Response schema for listing opportunities."""

    status = fields.Integer(required=True, metadata={"description": "The HTTP status code"})
    message = fields.String(required=True, metadata={"description": "The message"})
    items = fields.List(
        fields.Nested(OpportunityBase),
        required=True,
        metadata={"description": "The list of opportunities"},
    )
    pagination_info = fields.Nested(
        PaginatedResultsInfo,
        required=True,
        data_key="paginationInfo",
        metadata={"description": "The pagination details"},
    )


class OpportunitiesSearchResponse(Schema):
    """Response schema for searching opportunities."""

    status = fields.Integer(required=True, metadata={"description": "The HTTP status code"})
    message = fields.String(required=True, metadata={"description": "The message"})
    items = fields.List(
        fields.Nested(OpportunityBase),
        required=True,
        metadata={"description": "The list of opportunities"},
    )
    pagination_info = fields.Nested(
        PaginatedResultsInfo,
        required=True,
        data_key="paginationInfo",
        metadata={"description": "The pagination details"},
    )
    sort_info = fields.Nested(
        SortedResultsInfo,
        required=True,
        data_key="sortInfo",
        metadata={"description": "The sorting details"},
    )
    filter_info = fields.Nested(
        FilterInfo,
        required=True,
        data_key="filterInfo",
        metadata={"description": "The filter details"},
    )


class OpportunityResponse(Schema):
    """Response schema for a single opportunity."""

    status = fields.Integer(required=True, metadata={"description": "The HTTP status code"})
    message = fields.String(required=True, metadata={"description": "The message"})
    data = fields.Nested(OpportunityBase, required=True, metadata={"description": "The opportunity"})


# Error response schema
class Error(Schema):
    """Standard error response schema."""

    status = fields.Integer(required=True, metadata={"description": "The HTTP status code"})
    message = fields.String(required=True, metadata={"description": "Human-readable error message"})
    errors = fields.List(fields.Raw, required=True, metadata={"description": "List of errors"})


class ValidationError(Schema):
    """Validation error schema."""

    loc = fields.List(fields.Raw, required=True, metadata={"description": "Location of the error"})
    msg = fields.String(required=True, metadata={"description": "Error message"})
    type = fields.String(required=True, metadata={"description": "Error type"})


class HTTPValidationError(Schema):
    """HTTP validation error response schema."""

    detail = fields.List(
        fields.Nested(ValidationError),
        required=True,
        metadata={"description": "Validation error details"},
    )


class HTTPError(Schema):
    """APIFlask HTTP error schema."""

    status = fields.Integer(required=True, metadata={"description": "The HTTP status code"})
    message = fields.String(required=True, metadata={"description": "Human-readable error message"})
    errors = fields.List(fields.Raw, required=True, metadata={"description": "List of errors"})
