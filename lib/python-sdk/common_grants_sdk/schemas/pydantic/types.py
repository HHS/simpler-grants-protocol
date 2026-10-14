"""Base types for the CommonGrants API."""

from datetime import date, time, timezone
import re
from typing import Annotated

from pydantic import AfterValidator, AwareDatetime, BeforeValidator, StringConstraints


# Date and Time
def _reject_offset(v: time) -> time:
    """Core ``isoTime`` is a plain clock time: keep it zone-less rather than drop
    (and so silently change) an offset."""
    if v.tzinfo is not None:
        raise ValueError("Time must be a plain clock time without a UTC offset")
    return v


ISODate = date
ISOTime = Annotated[time, AfterValidator(_reject_offset)]
# A timestamp needs a zone to name an instant; normalize it to the UTC Core states.
UTCDateTime = Annotated[
    AwareDatetime, AfterValidator(lambda v: v.astimezone(timezone.utc))
]


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

    # The emitted Core pattern, ASCII digits only. As in any Python regex, ``$`` also
    # matches before one trailing newline, which the JSON Schema pattern does not.
    if not re.match(r"^-?[0-9]+\.?[0-9]*$", v):
        raise ValueError(
            "Value must be a valid decimal number (e.g., '123.45', '-123.45', '123', '-123')"
        )

    return v


DecimalString = Annotated[
    str,
    BeforeValidator(validate_decimal_string),
]


# Registry identifier values (Core ``employerTaxId``, ``samUEI``, ``duns``)
EmployerTaxId = Annotated[str, StringConstraints(pattern=r"^[0-9]{9}$")]
SamUEI = Annotated[str, StringConstraints(pattern=r"^[A-HJ-NP-Z0-9]{12}$")]
Duns = Annotated[str, StringConstraints(pattern=r"^[0-9]{9}$")]


__all__ = [
    "ISODate",
    "ISOTime",
    "UTCDateTime",
    "DecimalString",
    "Duns",
    "EmployerTaxId",
    "SamUEI",
]
