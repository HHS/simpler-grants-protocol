"""Schemas for the CommonGrants API sorted responses."""

from typing import Optional

from pydantic import BaseModel, Field


class SortedResultsInfo(BaseModel):
    """Sorting information for search results."""

    sort_by: str = Field(
        ...,
        alias="sortBy",
        description="The field results are sorted by",
    )
    custom_sort_by: Optional[str] = Field(
        default=None,
        alias="customSortBy",
        description="Implementation-defined sort key used to sort the results, if applicable",
    )
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

    model_config = {"populate_by_name": True}
