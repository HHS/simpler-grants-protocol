"""Paginated models for the CommonGrants API."""

from pydantic import BaseModel, Field

from .base import CAMEL_WIRE_CONFIG


class PaginatedBase(BaseModel):
    """Parameters for pagination."""

    page: int = Field(
        default=1,
        description="The page number to retrieve",
        ge=1,
    )
    page_size: int = Field(
        default=10,
        description="The number of items per page",
        ge=1,
    )

    model_config = CAMEL_WIRE_CONFIG


class PaginatedBodyParams(PaginatedBase):
    """Parameters for pagination in the body of a request."""


class PaginatedQueryParams(PaginatedBase):
    """Parameters for pagination in a request query."""


class PaginatedResultsInfo(PaginatedBase):
    """Information about the pagination of a list."""

    total_items: int = Field(
        ...,
        description="The total number of items",
    )
    total_pages: int = Field(
        ...,
        description="The total number of pages",
    )

    model_config = CAMEL_WIRE_CONFIG
