"""Base types for the CommonGrants API."""

from datetime import date, datetime, time
import re
from typing import Annotated

from pydantic import BeforeValidator


# Date and Time
ISODate = date
ISOTime = time
UTCDateTime = datetime


# DecimalString
def validate_decimal_string(v: str) -> str:
    """Validate a string represents a valid decimal number.

    Args:
        v: The string to validate

    Returns:
        The validated string

    Raises:
        ValueError: If the string is not a valid decimal number
    """
    if not isinstance(v, str):
        raise ValueError("Value must be a string")

    if not re.match(r"^-?\d*\.?\d+$", v):
        raise ValueError(
            "Value must be a valid decimal number (e.g., '123.45', '-123.45', '123', '-123')"
        )

    return v


DecimalString = Annotated[
    str,
    BeforeValidator(validate_decimal_string),
]


__all__ = [
    "ISODate",
    "ISOTime",
    "UTCDateTime",
    "DecimalString",
]
