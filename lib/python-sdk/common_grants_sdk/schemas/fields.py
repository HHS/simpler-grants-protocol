"""Base field types and common models for the CommonGrants API."""

from datetime import date, datetime, time
from enum import StrEnum
import re
from typing import Annotated, Any, Literal, Optional, Union

from pydantic import Field, HttpUrl, BeforeValidator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel

# Date and Time
ISODate = date
ISOTime = time
UTCDateTime = datetime


# DecimalString
def validate_decimal_string(v: str) -> str:
    """Validate a string represents a valid decimal number.

    Args:
        v: The string to validate

    Returns:
        The validated string

    Raises:
        ValueError: If the string is not a valid decimal number
    """
    if not isinstance(v, str):
        raise ValueError("Value must be a string")

    if not re.match(r"^-?\d*\.?\d+$", v):
        raise ValueError(
            "Value must be a valid decimal number (e.g., '123.45', '-123.45', '123', '-123')"
        )

    return v


DecimalString = Annotated[
    str,
    BeforeValidator(validate_decimal_string),
]


# Money
class Money(CommonGrantsBaseModel):
    """Represents a monetary amount in a specific currency."""

    amount: DecimalString = Field(
        ...,
        description="The amount of money",
        examples=["1000000", "500.00", "-100.50"],
    )
    currency: str = Field(
        ...,
        description="The ISO 4217 currency code (e.g., 'USD', 'EUR')",
        examples=["USD", "EUR", "GBP", "JPY"],
    )


# Event Types
class EventType(StrEnum):
    """Type of event (e.g., a single date, a date range, or a custom event)."""

    SINGLE_DATE = "singleDate"
    DATE_RANGE = "dateRange"
    OTHER = "other"


# Event Base
class EventBase(CommonGrantsBaseModel):
    """Base model for all events."""

    name: str = Field(
        ...,
        description="Human-readable name of the event (e.g., 'Application posted', 'Question deadline')",
        min_length=1,
    )
    event_type: EventType = Field(
        ...,
        alias="eventType",
        description="Type of event",
    )
    description: Optional[str] = Field(
        default=None,
        description="Description of what this event represents",
    )


# Single Date Event
class SingleDateEvent(EventBase):
    """Description of an event that has a date (and possible time) associated with it."""

    event_type: Literal[EventType.SINGLE_DATE] = Field(
        EventType.SINGLE_DATE,
        alias="eventType",
    )
    date: ISODate = Field(
        ...,
        description="Date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    time: Optional[ISOTime] = Field(
        default=None,
        description="Time of the event in ISO 8601 format: HH:MM:SS",
    )


# Date Range Event
class DateRangeEvent(EventBase):
    """Description of an event that has a start and end date (and possible time) associated with it."""

    event_type: Literal[EventType.DATE_RANGE] = Field(
        EventType.DATE_RANGE,
        alias="eventType",
    )
    start_date: ISODate = Field(
        ...,
        alias="startDate",
        description="Start date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    start_time: Optional[ISOTime] = Field(
        default=None,
        alias="startTime",
        description="Start time of the event in ISO 8601 format: HH:MM:SS",
    )
    end_date: ISODate = Field(
        ...,
        alias="endDate",
        description="End date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    end_time: Optional[ISOTime] = Field(
        default=None,
        alias="endTime",
        description="End time of the event in ISO 8601 format: HH:MM:SS",
    )


# Other Event
class OtherEvent(EventBase):
    """Description of an event that is not a single date or date range."""

    event_type: Literal[EventType.OTHER] = Field(
        EventType.OTHER,
        alias="eventType",
    )
    details: Optional[str] = Field(
        default=None,
        description="Details of the event's timeline (e.g. 'Every other Tuesday')",
    )


# Event Union
Event = Union[SingleDateEvent, DateRangeEvent, OtherEvent]


# CustomField
class CustomFieldType(StrEnum):
    """The type of the custom field."""

    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class CustomField(CommonGrantsBaseModel):
    """Represents a custom field with type information and validation schema."""

    name: str = Field(
        ...,
        description="Name of the custom field",
        min_length=1,
    )
    field_type: CustomFieldType = Field(
        ...,
        alias="fieldType",
        description="The JSON schema type to use when de-serializing the `value` field",
    )
    schema_url: Optional[HttpUrl] = Field(
        None,
        alias="schema",
        description="Link to the full JSON schema for this custom field",
    )
    value: Any = Field(..., description="Value of the custom field")
    description: Optional[str] = Field(
        None,
        description="Description of the custom field's purpose",
    )


# SystemMetadata
class SystemMetadata(CommonGrantsBaseModel):
    """System-managed metadata fields for tracking record creation and modification."""

    created_at: UTCDateTime = Field(
        ...,
        alias="createdAt",
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        alias="lastModifiedAt",
        description="The timestamp (in UTC) at which the record was last modified.",
    )


__all__ = [
    "ISODate",
    "ISOTime",
    "UTCDateTime",
    "DecimalString",
    "Money",
    "EventType",
    "EventBase",
    "SingleDateEvent",
    "DateRangeEvent",
    "OtherEvent",
    "Event",
    "CustomFieldType",
    "CustomField",
    "SystemMetadata",
]
