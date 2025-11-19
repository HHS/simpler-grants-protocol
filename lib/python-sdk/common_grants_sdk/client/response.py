"""Response models for the CommonGrants API client."""

from pydantic import Field

from ..schemas.pydantic.responses import Success


class SuccessResponse(Success):
    """Success response with data field."""

    data: dict = Field(default_factory=dict, description="The response data")
