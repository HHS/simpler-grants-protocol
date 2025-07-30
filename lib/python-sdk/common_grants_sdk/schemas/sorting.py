"""Schemas for the CommonGrants API sorted responses."""

from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field


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
