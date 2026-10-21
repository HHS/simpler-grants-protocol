"""Model for a funding opportunity with its details."""

from __future__ import annotations

from typing import Any, Generic, Optional

from pydantic import Field, ModelWrapValidatorHandler, model_validator

from ..fields import CustomField  # noqa: F401 -- resolves CF's string default
from .award import AwdRef
from .opp_base import CF, OpportunityBase


class OpportunityDetails(OpportunityBase[CF], Generic[CF]):
    """A funding opportunity with its details, such as the awards it resulted in.

    Generic over the same custom-fields container as ``OpportunityBase``. This
    model supports related award references. Core also defines ``competitions``:
    application processes, often with distinct forms and application periods. This
    model ignores that field like other unknown properties.
    """

    awards: Optional[list[AwdRef]] = Field(
        default=None,
        description=(
            "Awards that resulted from this opportunity, as references. Absent means "
            "the link is not published; empty means no awards are known. Entries "
            "carry no ordering guarantee and may not be retrievable through this API."
        ),
    )

    # A valid base record is a valid detail record. Read another opportunity model
    # through the wire recipe: reading its attributes (or its __dict__, which is
    # what a before validator sees) would turn unset properties into nulls.
    # Anything it supplies, awards included, is still validated.
    @model_validator(mode="wrap")
    @classmethod
    def _from_opportunity_model(
        cls, data: Any, handler: ModelWrapValidatorHandler[Any]
    ) -> Any:
        if isinstance(data, OpportunityBase) and not isinstance(data, cls):
            data = data.model_dump(mode="json", by_alias=True, exclude_unset=True)
        return handler(data)

    # Same Core v0.5 rule as the base additions: awards may be omitted but not
    # null, so a null reads as omitted.
    @model_validator(mode="before")
    @classmethod
    def _null_awards_as_omitted(cls, data: Any) -> Any:
        if isinstance(data, dict) and "awards" in data and data["awards"] is None:
            return {k: v for k, v in data.items() if k != "awards"}
        return data
