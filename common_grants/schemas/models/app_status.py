"""Models for application statuses."""

from enum import StrEnum

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


class ApplicationStatus(CommonGrantsBaseModel):
    """Represents the status of a grant application."""

    value: ApplicationStatusOptions = Field(
        ...,
        description="The status value, from a predefined set of options",
    )
    description: str = Field(
        default="",
        description="A human-readable description of the status",
    ) 