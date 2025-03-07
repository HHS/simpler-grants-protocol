from datetime import date, datetime, time
from enum import StrEnum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl
from pydantic.functional_validators import AfterValidator
from typing_extensions import Annotated


# Custom Types
DecimalString = Annotated[
    str,
    AfterValidator(
        lambda v: (
            v
            if v.replace(".", "").replace("-", "").isdigit()
            and (v.startswith("-") or not v.startswith("-"))
            else None
        )
    ),
]
ISODate = date
ISOTime = time
UTCDateTime = datetime
Url = HttpUrl


# Enums
class OppStatusOptions(StrEnum):
    """The status of the opportunity"""

    FORECASTED = "forecasted"
    OPEN = "open"
    CLOSED = "closed"
    CUSTOM = "custom"


class CustomFieldType(StrEnum):
    """The type of the custom field"""

    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class OppSortBy(StrEnum):
    LAST_MODIFIED_AT = "lastModifiedAt"
    CREATED_AT = "createdAt"
    TITLE = "title"
    STATUS = "status.value"
    CLOSE_DATE = "keyDates.closeDate"
    MAX_AWARD_AMOUNT = "funding.maxAwardAmount"
    MIN_AWARD_AMOUNT = "funding.minAwardAmount"
    TOTAL_FUNDING_AVAILABLE = "funding.totalAmountAvailable"
    ESTIMATED_AWARD_COUNT = "funding.estimatedAwardCount"
    CUSTOM = "custom"


# Base Models
class SystemMetadata(BaseModel):
    created_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was last modified.",
    )


class Money(BaseModel):
    amount: DecimalString = Field(..., description="The amount of money")
    currency: str = Field(
        ..., description="The ISO 4217 currency code in which the amount is denominated"
    )


class Event(BaseModel):
    name: str = Field(..., description="Human-readable name of the event")
    date: ISODate = Field(
        ...,
        description="Date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    time: Optional[ISOTime] = Field(
        None,
        description="Time of the event in ISO 8601 format: HH:MM:SS",
    )
    description: Optional[str] = Field(
        None,
        description="Description of what this event represents",
    )


class CustomField(BaseModel):
    name: str = Field(..., description="Name of the custom field")
    field_type: CustomFieldType = Field(
        ...,
        alias="type",
        description="The JSON schema type to use when de-serializing the `value` field",
    )
    schema_url: Optional[Url] = Field(
        None,
        alias="schema",
        description="Link to the full JSON schema for this custom field",
    )
    value: Any = Field(..., description="Value of the custom field")
    description: Optional[str] = Field(
        None,
        description="Description of the custom field's purpose",
    )


# Opportunity Models
class OppStatus(BaseModel):
    value: OppStatusOptions = Field(
        ..., description="The status value, from a predefined set of options"
    )
    custom_value: Optional[str] = Field(None, description="A custom status value")
    description: Optional[str] = Field(
        None, description="A human-readable description of the status"
    )


class OppFunding(BaseModel):
    total_amount_available: Optional[Money] = Field(
        None,
        description="Total amount of funding available for this opportunity",
    )
    min_award_amount: Optional[Money] = Field(
        None,
        description="Minimum amount of funding granted per award",
    )
    max_award_amount: Optional[Money] = Field(
        None,
        description="Maximum amount of funding granted per award",
    )
    min_award_count: Optional[int] = Field(
        None,
        description="Minimum number of awards granted",
    )
    max_award_count: Optional[int] = Field(
        None,
        description="Maximum number of awards granted",
    )
    estimated_award_count: Optional[int] = Field(
        None,
        description="Estimated number of awards that will be granted",
    )


class OppTimeline(BaseModel):
    app_opens: Optional[Event] = Field(
        None,
        description="The date (and time) at which the opportunity begins accepting applications",
    )
    app_deadline: Optional[Event] = Field(
        None, description="The final deadline for submitting applications"
    )
    other_dates: Optional[Dict[str, Event]] = Field(
        None,
        description="An optional map of other key dates in the opportunity timeline",
    )


class OpportunityBase(BaseModel):
    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    status: OppStatus = Field(..., description="Status of the opportunity")
    description: str = Field(
        ..., description="Description of the opportunity's purpose and scope"
    )
    funding: OppFunding = Field(..., description="Details about the funding available")
    key_dates: OppTimeline = Field(
        ...,
        description="Key dates for the opportunity, such as when the application opens and closes",
    )
    source: Optional[Url] = Field(
        None,
        description="URL for the original source of the opportunity",
    )
    custom_fields: Optional[Dict[str, CustomField]] = Field(
        None,
        description="Additional custom fields specific to this opportunity",
    )

    # System metadata fields
    created_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was last modified.",
    )


# Filter Models
class StringArrayFilter(BaseModel):
    operator: str = Field(..., description="The operator to apply to the filter")
    value: List[str] = Field(..., description="The values to filter by")


class DateRange(BaseModel):
    min: Optional[ISODate] = Field(None, description="The minimum date in the range")
    max: Optional[ISODate] = Field(None, description="The maximum date in the range")


class DateRangeFilter(BaseModel):
    operator: str = Field(..., description="The operator to apply to the filter")
    value: DateRange = Field(..., description="The date range to filter by")


class MoneyRange(BaseModel):
    min: Optional[Money] = Field(None, description="The minimum amount in the range")
    max: Optional[Money] = Field(None, description="The maximum amount in the range")


class MoneyRangeFilter(BaseModel):
    operator: str = Field(..., description="The operator to apply to the filter")
    value: MoneyRange = Field(..., description="The money range to filter by")


class DefaultFilter(BaseModel):
    """Base class for all filters"""

    pass


class OppDefaultFilters(BaseModel):
    status: Optional[StringArrayFilter] = Field(
        default=None,
        description="`status.value` matches one of the following values",
    )
    close_date_range: Optional[DateRangeFilter] = Field(
        default=None,
        description="`keyDates.closeDate` is between the given range",
    )
    total_funding_available_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        description="`funding.totalAmountAvailable` is between the given range",
    )
    min_award_amount_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        description="`funding.minAwardAmount` is between the given range",
    )
    max_award_amount_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        description="`funding.maxAwardAmount` is between the given range",
    )


class OppFilters(OppDefaultFilters):
    custom_filters: Optional[Dict[str, DefaultFilter]] = Field(
        default=None,
        description="Additional implementation-defined filters to apply to the search",
    )


# Sorting Models
class OppSorting(BaseModel):
    sort_by: OppSortBy = Field(..., description="The field to sort by")
    sort_order: str = Field("desc", description="The sort order (asc or desc)")


# Pagination Models
class PaginationParams(BaseModel):
    page: Optional[int] = Field(
        default=1,
        description="The page number to retrieve",
        ge=1,
    )
    page_size: Optional[int] = Field(
        default=10,
        description="The number of items per page",
        ge=1,
    )


# Response Models
class OpportunityResponse(BaseModel):
    data: OpportunityBase


class OpportunitiesListResponse(BaseModel):
    data: List[OpportunityBase]
    pagination: PaginationParams
    total_count: int


class OpportunitiesSearchResponse(BaseModel):
    data: List[OpportunityBase]
    pagination: PaginationParams
    total_count: int
    filters: OppFilters
