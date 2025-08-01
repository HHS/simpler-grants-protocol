"""Success response schemas for the CommonGrants API."""

from typing import Generic, TypeVar, Optional

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.sorting import SortedResultsInfo
from .base import DefaultResponse

T = TypeVar("T")
ItemsT = TypeVar("ItemsT")
FilterT = TypeVar("FilterT")


class Success(DefaultResponse):
    """Default success response."""

    status: int = Field(
        default=200,
        description="The HTTP status code",
        examples=[200],
    )
    message: str = Field(
        default="Success",
        description="The message",
        examples=["Success"],
    )


class Paginated(Success, Generic[ItemsT]):
    """Template for a response with a paginated list of items."""

    items: list[ItemsT] = Field(..., description="Items from the current page")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="Details about the paginated results",
        alias="paginationInfo",
    )

    model_config = {"populate_by_name": True}


class Sorted(Paginated[ItemsT], Generic[ItemsT]):
    """A paginated list of items with a sort order."""

    sort_info: SortedResultsInfo = Field(
        ...,
        description="The sort order of the items",
        alias="sortInfo",
    )

    model_config = {"populate_by_name": True}


class FilterInfo(CommonGrantsBaseModel, Generic[FilterT]):
    """Filter information for search results."""

    filters: FilterT = Field(
        ..., description="The filters applied to the response items"
    )
    errors: Optional[list[str]] = Field(
        default_factory=lambda: [],
        description="Non-fatal errors that occurred during filtering",
    )


class Filtered(Sorted[ItemsT], Generic[ItemsT, FilterT]):
    """A paginated list of items with a filter."""

    filter_info: FilterInfo[FilterT] = Field(
        ...,
        description="The filters applied to the response items",
        alias="filterInfo",
    )

    model_config = {"populate_by_name": True}
