"""Schemas for the CommonGrants API sorted responses."""

from enum import Enum, StrEnum
from typing import Optional, Union

from pydantic import BaseModel, Field, model_validator


class SortOrder(str, Enum):
    """Sort order enumeration."""

    ASC = "asc"
    DESC = "desc"


class SortBase(BaseModel):
    """Base class for sorting-related models."""

    sort_by: Union[str, None] = Field(
        ...,
        alias="sortBy",
        description="The field to sort by",
        examples=["lastModifiedAt"],
    )
    custom_sort_by: Optional[str] = Field(
        default=None,
        alias="customSortBy",
        description="Implementation-defined sort key",
        examples=["customField"],
    )

    model_config = {"populate_by_name": True}


class SortQueryParams(SortBase):
    """Query parameters for sorting."""

    sort_order: Optional[SortOrder] = Field(
        default=None,
        alias="sortOrder",
        description="The order to sort by",
        examples=[SortOrder.ASC],
    )


class SortBodyParams(SortBase):
    """Sorting parameters included in the request body."""

    sort_order: Optional[SortOrder] = Field(
        default=None,
        alias="sortOrder",
        description="The order to sort by",
        examples=[SortOrder.ASC],
    )


class SortedResultsInfo(SortBase):
    """Sorting information for search results."""

    sort_order: str = Field(
        ...,
        alias="sortOrder",
        description="The order in which the results are sorted",
    )
    errors: Optional[list[str]] = Field(
        default_factory=lambda: [],
        description="Non-fatal errors that occurred during sorting",
        json_schema_extra={"items": {"type": "string"}},
    )


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

    @model_validator(mode="after")
    def validate_custom_sort_by(self) -> "OppSorting":
        """Validate that customSortBy is provided when sortBy is 'custom'."""
        if self.sort_by == OppSortBy.CUSTOM and not self.custom_sort_by:
            e = "customSortBy is required when sortBy is 'custom'"
            raise ValueError(e)
        return self

    model_config = {"populate_by_name": True}
