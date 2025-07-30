"""Event field types for the CommonGrants API."""

from enum import StrEnum
from typing import Literal, Optional, Union

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.types import ISODate, ISOTime


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


__all__ = [
    "EventType",
    "EventBase",
    "SingleDateEvent",
    "DateRangeEvent",
    "OtherEvent",
    "Event",
]
