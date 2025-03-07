"""Pagination models for the CommonGrants API."""

from typing import Optional

from pydantic import BaseModel, Field


class PaginationBase(BaseModel):
    """Parameters for pagination."""

    page: Optional[int] = Field(
        default=1,
        description="The page number to retrieve",
        ge=1,
    )
    page_size: Optional[int] = Field(
        default=10,
        description="The number of items per page",
        ge=1,
    )


class PaginationInfo(PaginationBase):
    """Information about the pagination of a list."""

    total_count: int = Field(..., description="The total number of items")
    total_pages: int = Field(..., description="The total number of pages")


class PaginationBodyParams(PaginationBase):
    """Parameters for pagination in the body of a request."""
