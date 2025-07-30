"""Base response schemas for the CommonGrants API."""

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel


class DefaultResponse(CommonGrantsBaseModel):
    """Response for a default operation."""

    status: int = Field(
        ...,
        description="The HTTP status code",
        examples=[200, 201, 204],
    )
    message: str = Field(
        ...,
        description="The message",
        examples=["Success"],
    )
