"""Custom field types for the CommonGrants API."""

from enum import StrEnum
from typing import Any, Optional

from pydantic import Field, HttpUrl

from common_grants_sdk.schemas.base import CommonGrantsBaseModel


# CustomField
class CustomFieldType(StrEnum):
    """The type of the custom field."""

    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
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
    field_type: CustomFieldType = Field(
        ...,
        alias="fieldType",
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


__all__ = [
    "CustomFieldType",
    "CustomField",
]
