"""Paginated models for the CommonGrants API."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedBase(BaseModel):
    """Parameters for pagination."""

    page: int = Field(
        default=1,
        description="The page number to retrieve",
        ge=1,
    )
    page_size: int = Field(
        default=10,
        alias="pageSize",
        description="The number of items per page",
        ge=1,
    )

    model_config = {"populate_by_name": True}


class PaginatedBodyParams(PaginatedBase):
    """Parameters for pagination in the body of a request."""


class PaginatedQueryParams(PaginatedBase):
    """Parameters for pagination in a request query."""


class PaginatedResultsInfo(PaginatedBase):
    """Information about the pagination of a list."""

    total_items: int = Field(
        ...,
        alias="totalItems",
        description="The total number of items",
    )
    total_pages: int = Field(
        ...,
        alias="totalPages",
        description="The total number of pages",
    )

    model_config = {"populate_by_name": True}


class PaginatedItems(BaseModel, Generic[T]):
    """A paginated list of items."""

    items: list[T] = Field(..., description="The list of items")
    paginated_info: PaginatedResultsInfo = Field(
        ...,
        alias="paginatedInfo",
        description="Information about the pagination",
    )

    model_config = {"populate_by_name": True}
