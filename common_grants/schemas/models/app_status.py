"""Models for application statuses."""

from enum import StrEnum
from typing import Optional

from pydantic import Field

from ..base import CommonGrantsBaseModel


class ApplicationStatusOptions(StrEnum):
    """The status of the application."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    
    def __lt__(self, other):
        """Define the order of status transitions."""
        order = {
            self.DRAFT: 0,
            self.SUBMITTED: 1,
            self.UNDER_REVIEW: 2,
            self.APPROVED: 3,
            self.REJECTED: 3,
            self.WITHDRAWN: 1,
        }
        return order[self] < order[other]


class ApplicationStatus(CommonGrantsBaseModel):
    """Represents the status of an application."""

    value: ApplicationStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    description: str = Field(
        ...,
        description="A human-readable description of the status",
        min_length=1,
    ) 