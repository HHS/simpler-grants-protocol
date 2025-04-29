"""Base field types and common models for the CommonGrants API."""

from typing import Any, Optional

from common_grants_sdk.schemas.fields import (
    CustomField as SDKCustomField,
)
from common_grants_sdk.schemas.fields import (
    CustomFieldType,
    DecimalString,
    Event,
    ISODate,
    ISOTime,
    Money,
    SystemMetadata,
    UTCDateTime,
)
from pydantic import HttpUrl

# Re-export the fields
__all__ = [
    "CustomField",
    "CustomFieldType",
    "DecimalString",
    "Event",
    "ISODate",
    "ISOTime",
    "Money",
    "SystemMetadata",
    "UTCDateTime",
    "Url",
]

Url = HttpUrl


class CustomField(SDKCustomField):
    """Compatibility layer for CustomField to handle field_type vs type attribute."""

    def __init__(self, **data: dict[str, Any]) -> None:
        """
        Initialize the CustomField with compatibility for field_type attribute.

        Args:
            **data: The field data, which may include a field_type attribute.

        """
        # Handle field_type vs type attribute
        if "field_type" in data:
            data["type"] = data.pop("field_type")
        super().__init__(**data)

    @property
    def field_type(self) -> Optional[CustomFieldType]:
        """Alias for type attribute to maintain compatibility with tests."""
        return getattr(self, "type", None)

    @field_type.setter
    def field_type(self, value: CustomFieldType) -> None:
        """Setter for field_type that updates the type attribute."""
        self.type = value
