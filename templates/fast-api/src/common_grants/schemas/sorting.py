"""Sorting models for the CommonGrants API."""

from enum import StrEnum

from pydantic import BaseModel, Field


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
        "desc",
        description="The sort order (asc or desc)",
        alias="sortOrder",
    )
