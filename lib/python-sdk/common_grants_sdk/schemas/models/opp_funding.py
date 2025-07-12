"""Encapsulates details about the funding available for an opportunity."""

from typing import Optional

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.fields import Money


class OppFunding(CommonGrantsBaseModel):
    """Details about the funding available for an opportunity."""

    details: Optional[str] = Field(
        default=None,
        description="Details about the funding available for this opportunity that don't fit other fields",
    )
    total_amount_available: Optional[Money] = Field(
        default=None,
        alias="totalAmountAvailable",
        description="Total amount of funding available for this opportunity",
    )
    min_award_amount: Optional[Money] = Field(
        default=None,
        alias="minAwardAmount",
        description="Minimum amount of funding granted per award",
    )
    max_award_amount: Optional[Money] = Field(
        default=None,
        alias="maxAwardAmount",
        description="Maximum amount of funding granted per award",
    )
    min_award_count: Optional[int] = Field(
        default=None,
        alias="minAwardCount",
        description="Minimum number of awards granted",
    )
    max_award_count: Optional[int] = Field(
        default=None,
        alias="maxAwardCount",
        description="Maximum number of awards granted",
    )
    estimated_award_count: Optional[int] = Field(
        default=None,
        alias="estimatedAwardCount",
        description="Estimated number of awards that will be granted",
    )
