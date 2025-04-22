"""Base field types and common models for the CommonGrants API."""

from datetime import date, datetime, time
from enum import StrEnum
from typing import Annotated, Any, Optional
from uuid import UUID

from pydantic import Field, HttpUrl
from pydantic.functional_validators import AfterValidator

from common_grants.schemas.base import CommonGrantsBaseModel

# Custom Types
DecimalString = Annotated[
    str,
    AfterValidator(
        lambda v: (
            v
            if v.replace(".", "").replace("-", "").isdigit()
            and (v.startswith("-") or not v.startswith("-"))
            else None
        ),
    ),
]
ISODate = date
ISOTime = time
UTCDateTime = datetime
Url = HttpUrl


# Enums
class CustomFieldType(StrEnum):
    """The type of the custom field."""

    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class Currency(StrEnum):
    """ISO 4217 currency codes."""

    USD = "USD"  # United States Dollar
    EUR = "EUR"  # Euro
    GBP = "GBP"  # British Pound Sterling
    CAD = "CAD"  # Canadian Dollar
    AUD = "AUD"  # Australian Dollar
    JPY = "JPY"  # Japanese Yen


# Base Models
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


class Money(CommonGrantsBaseModel):
    """Represents a monetary amount in a specific currency."""

    amount: str = Field(
        ...,
        description="The amount of money",
        pattern=r"^-?[0-9]+\.?[0-9]*$",
        examples=["1000000", "500.00", "-100.50"],
    )
    currency: Currency = Field(
        ...,
        description="The ISO 4217 currency code in which the amount is denominated",
    )


class Event(CommonGrantsBaseModel):
    """Represents a scheduled event with an optional time and description."""

    name: str = Field(..., description="Human-readable name of the event")
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


class CustomField(CommonGrantsBaseModel):
    """Represents a custom field with type information and validation schema."""

    name: str = Field(..., description="Name of the custom field")
    field_type: CustomFieldType = Field(
        ...,
        alias="type",
        description="The JSON schema type to use when de-serializing the `value` field",
    )
    schema_url: Optional[Url] = Field(
        None,
        alias="schema",
        description="Link to the full JSON schema for this custom field",
    )
    value: Any = Field(..., description="Value of the custom field")
    description: Optional[str] = Field(
        None,
        description="Description of the custom field's purpose",
    ) 