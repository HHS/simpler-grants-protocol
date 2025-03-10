"""Pagination models for the CommonGrants API."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationBase(BaseModel):
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


class PaginationInfo(PaginationBase):
    """Information about the pagination of a list."""

    total_count: int = Field(
        ...,
        alias="totalCount",
        description="The total number of items",
    )
    total_pages: int = Field(
        ...,
        alias="totalPages",
        description="The total number of pages",
    )


class PaginationBodyParams(PaginationBase):
    """Parameters for pagination in the body of a request."""


class PaginatedItems(BaseModel, Generic[T]):
    """A paginated list of items."""

    items: list[T] = Field(..., description="The list of items")
    pagination_info: PaginationInfo = Field(
        ...,
        description="Information about the pagination",
    )
