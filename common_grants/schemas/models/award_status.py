"""Models for award statuses."""

from enum import StrEnum

from pydantic import Field

from ..base import CommonGrantsBaseModel


class AwardStatusOptions(StrEnum):
    """The status of the award."""

    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"
    SUSPENDED = "suspended"


class AwardStatus(CommonGrantsBaseModel):
    """Represents the status of a grant award."""

    value: AwardStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    description: str = Field(
        default="",
        description="A human-readable description of the status",
    ) 