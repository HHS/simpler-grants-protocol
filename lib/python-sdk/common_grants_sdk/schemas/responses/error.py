"""Error response schemas for the CommonGrants API."""

from typing import Any

from pydantic import Field

from .base import DefaultResponse


class Error(DefaultResponse):
    """A standard error response schema, used to create custom error responses."""

    status: int = Field(
        default=400,
        description="The HTTP status code",
        examples=[400],
    )
    message: str = Field(
        default="Error",
        description="Human-readable error message",
        examples=["Error"],
    )
    errors: list[Any] = Field(
        ...,
        description="List of errors",
    )
