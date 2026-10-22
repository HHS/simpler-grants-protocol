"""Money field types for the CommonGrants API."""

from pydantic import Field

from .._contract import SealedModel
from ..types import DecimalString


# Money
class Money(SealedModel):
    """Represents a monetary amount in a specific currency."""

    amount: DecimalString = Field(
        ...,
        description="The amount of money",
        examples=["1000000", "500.00", "-100.50"],
    )
    currency: str = Field(
        ...,
        description="The ISO 4217 currency code (e.g., 'USD', 'EUR')",
        examples=["USD", "EUR", "GBP", "JPY"],
    )


__all__ = [
    "Money",
]
