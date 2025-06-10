"""Sorting models for the CommonGrants API."""

from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, ValidationInfo


class OppSortBy(StrEnum):
    """Fields by which opportunities can be sorted."""

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


class OppSorting(BaseModel):
    """Sorting options for opportunities."""

    sort_by: OppSortBy = Field(
        ...,
        description="The field to sort by",
        alias="sortBy",
    )
    sort_order: str = Field(
        default="desc",
        description="The sort order (asc or desc)",
        alias="sortOrder",
    )
    custom_sort_by: Optional[str] = Field(
        default=None,
        description="The custom field to sort by when sortBy is 'custom'",
        alias="customSortBy",
    )

    @field_validator("custom_sort_by")
    @classmethod
    def validate_custom_sort_by(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        """Validate that customSortBy is provided when sortBy is 'custom'."""
        if info.data.get("sort_by") == OppSortBy.CUSTOM and not v:
            e = "customSortBy is required when sortBy is 'custom'"
            raise ValueError(e)
        return v
