"""Encapsulates opportunity status."""

from enum import StrEnum
from typing import Optional

from pydantic import Field

from ..base import CommonGrantsBaseModel


class OppStatusOptions(StrEnum):
    """The status of the opportunity."""

    FORECASTED = "forecasted"
    OPEN = "open"
    CUSTOM = "custom"
    CLOSED = "closed"

    def __lt__(self, other):
        """Define the order of status transitions."""
        order = {
            self.FORECASTED: 0,
            self.OPEN: 1,
            self.CUSTOM: 2,
            self.CLOSED: 3,
        }
        return order[self] < order[other]


class OppStatus(CommonGrantsBaseModel):
    """Represents the status of a funding opportunity."""

    value: OppStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    custom_value: Optional[str] = Field(
        default=None,
        alias="customValue",
        description="A custom status value",
    )
    description: Optional[str] = Field(
        default=None,
        description="A human-readable description of the status",
    )
