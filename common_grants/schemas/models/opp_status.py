"""Models for opportunity statuses."""

from enum import StrEnum
from typing import Optional

from pydantic import Field

from ..base import CommonGrantsBaseModel


class OppStatusOptions(StrEnum):
    """The status of the opportunity."""

    FORECASTED = "forecasted"
    OPEN = "open"
    CLOSED = "closed"
    CUSTOM = "custom"


class OppStatus(CommonGrantsBaseModel):
    """Represents the status of a funding opportunity."""

    value: OppStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    custom_value: Optional[str] = Field(
        default=None,
        description="A custom status value",
    )
    description: str = Field(
        ...,
        description="A human-readable description of the status",
        min_length=1,
    ) 