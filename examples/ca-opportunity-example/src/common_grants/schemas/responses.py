"""Response models that use CAOpportunity for correct custom_fields serialization."""

from common_grants_sdk.schemas.pydantic import (
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
)
from pydantic import Field

from common_grants.utils.opp_transform import CAOpportunity


class CAOpportunitiesListResponse(OpportunitiesListResponse):
    """List response with CA opportunities for correct custom_fields serialization."""

    items: list[CAOpportunity] = Field(
        ...,
        description="The list of opportunities",
    )


class CAOpportunitiesSearchResponse(OpportunitiesSearchResponse):
    """Search response with CA opportunities for correct custom_fields serialization."""

    items: list[CAOpportunity] = Field(
        ...,
        description="The list of opportunities",
    )


class CAOpportunityResponse(OpportunityResponse):
    """Single opportunity response with CA opportunity for correct custom_fields serialization."""

    data: CAOpportunity = Field(
        ...,
        description="The opportunity",
    )
