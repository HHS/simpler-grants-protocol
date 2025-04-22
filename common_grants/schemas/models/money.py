from pydantic import Field

from ..base import CommonGrantsBaseModel
from ..enums import Currency

class Money(CommonGrantsBaseModel):
    """Monetary amount with currency."""
    amount: float = Field(..., description="The monetary amount")
    currency: Currency = Field(..., description="The currency code") 