"""Generic Opportunity model parameterized by its custom-fields container."""

from __future__ import annotations

from typing import Generic, Optional, TypeVar

from pydantic import ConfigDict, Field

from .opp_base import OpportunityBase

CF = TypeVar("CF")


class Opportunity(OpportunityBase, Generic[CF]):
    """The common Opportunity model, generic over its custom-fields container.

    ``OpportunityBase`` carries every core field; this subclass overrides the
    ``custom_fields`` slot with the author's typed container ``CF`` so consumers
    get concrete, non-optional dot access (e.g. ``opp.custom_fields.agency_code``).
    Unextended plugins use ``Opportunity[NoCustomFields]``.

    ``populate_by_name=True`` lets callers construct with snake_case field names
    (``created_at=...``) while JSON I/O stays camelCase via the inherited aliases.
    """

    model_config = ConfigDict(
        from_attributes=True,
        strict=False,
        populate_by_name=True,
    )

    custom_fields: Optional[CF] = Field(  # type: ignore[assignment]
        default=None,
        alias="customFields",
        description="Additional custom fields specific to this opportunity",
    )
