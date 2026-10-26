"""Name field type for the CommonGrants API."""

from typing import Optional

from pydantic import Field

from .._contract import SealedModel


class Name(SealedModel):
    """A person's name."""

    prefix: Optional[str] = Field(
        default=None,
        description="Honorific prefix (e.g., Mr., Mrs., Dr., Prof.).",
    )
    first_name: str = Field(..., description="The person's first or given name.")
    middle_name: Optional[str] = Field(
        default=None,
        description="The person's middle name or names.",
    )
    last_name: str = Field(..., description="The person's last name or family name.")
    suffix: Optional[str] = Field(
        default=None,
        description="Name suffix (e.g., Jr., Sr., III, Ph.D.).",
    )


__all__ = [
    "Name",
]
