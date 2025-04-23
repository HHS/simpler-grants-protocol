"""Models for award statuses."""

from enum import StrEnum
from typing import Optional

from pydantic import Field

from ..base import CommonGrantsBaseModel


class AwardStatusOptions(StrEnum):
    """The status of the award."""

    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"
    SUSPENDED = "suspended"
    
    def __lt__(self, other):
        """Define the order of status transitions."""
        order = {
            self.PENDING: 0,
            self.ACTIVE: 1,
            self.COMPLETED: 2,
            self.TERMINATED: 2,
            self.SUSPENDED: 2,
        }
        return order[self] < order[other]


class AwardStatus(CommonGrantsBaseModel):
    """Represents the status of an award."""

    value: AwardStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    description: str = Field(
        ...,
        description="A human-readable description of the status",
        min_length=1,
    ) 