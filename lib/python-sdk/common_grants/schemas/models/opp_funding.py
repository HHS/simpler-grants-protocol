"""Encapsulates details about the funding available for an opportunity."""

from typing import Optional

from pydantic import Field

from common_grants.schemas.base import CommonGrantsBaseModel
from common_grants.schemas.fields import Money


class OppFunding(CommonGrantsBaseModel):
    """Details about the funding available for an opportunity."""

    total_amount_available: Optional[Money] = Field(
        default=None,
        description="Total amount of funding available for this opportunity",
    )
    min_award_amount: Optional[Money] = Field(
        default=None,
        description="Minimum amount of funding granted per award",
    )
    max_award_amount: Optional[Money] = Field(
        default=None,
        description="Maximum amount of funding granted per award",
    )
    min_award_count: Optional[int] = Field(
        default=None,
        description="Minimum number of awards granted",
    )
    max_award_count: Optional[int] = Field(
        default=None,
        description="Maximum number of awards granted",
    )
    estimated_award_count: Optional[int] = Field(
        default=None,
        description="Estimated number of awards that will be granted",
    ) 

