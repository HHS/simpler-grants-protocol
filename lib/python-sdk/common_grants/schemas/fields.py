"""Base field types and common models for the CommonGrants API."""

from datetime import date, datetime, time
from enum import StrEnum
import re
from typing import Annotated, Any, Optional
from uuid import UUID

from pydantic import Field, HttpUrl, BeforeValidator

from common_grants.schemas.base import CommonGrantsBaseModel

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
    
    if not re.match(r'^-?\d*\.?\d+$', v):
        raise ValueError("Value must be a valid decimal number (e.g., '123.45', '-123.45', '123', '-123')")
    
    return v

DecimalString = Annotated[
    str,
    BeforeValidator(validate_decimal_string),
]

# Money
class Money(CommonGrantsBaseModel):
    """Represents a monetary amount in a specific currency."""

    amount: DecimalString = Field(
        ...,
        description="The amount of money",
        examples=["1000000", "500.00", "-100.50"],
    )
    currency: str = Field(
        ...,
        description="The ISO 4217 currency code (e.g., 'USD', 'EUR')",
        pattern=r"^[A-Z]{3}$",
        min_length=3,
        max_length=3,
        examples=["USD", "EUR", "GBP", "JPY"]
    )


# Event
class Event(CommonGrantsBaseModel):
    """Represents a scheduled event with an optional time and description."""

    name: str = Field(
        ...,
        description="Human-readable name of the event",
        min_length=1,
    )
    date: ISODate = Field(
        ...,
        description="Date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    time: Optional[ISOTime] = Field(
        default=None,
        description="Time of the event in ISO 8601 format: HH:MM:SS",
    )
    description: Optional[str] = Field(
        default=None,
        description="Description of what this event represents",
    )


# CustomField
class CustomFieldType(StrEnum):
    """The type of the custom field."""

    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class CustomField(CommonGrantsBaseModel):
    """Represents a custom field with type information and validation schema."""

    name: str = Field(
        ...,
        description="Name of the custom field",
        min_length=1,
    )
    type: CustomFieldType = Field(
        ...,
        description="The JSON schema type to use when de-serializing the `value` field",
    )
    schema_url: Optional[HttpUrl] = Field(
        None,
        alias="schema",
        description="Link to the full JSON schema for this custom field",
    )
    value: Any = Field(..., description="Value of the custom field")
    description: Optional[str] = Field(
        None,
        description="Description of the custom field's purpose",
    ) 


# SystemMetadata
class SystemMetadata(CommonGrantsBaseModel):
    """System-managed metadata fields for tracking record creation and modification."""

    created_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was last modified.",
    )

