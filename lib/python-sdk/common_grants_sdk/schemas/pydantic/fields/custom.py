"""Custom field types for the CommonGrants API."""

from enum import StrEnum
from typing import Any, Generic, Optional

import typing_extensions as te
from pydantic import ConfigDict, Field, HttpUrl

from ..base import CommonGrantsBaseModel


# CustomField
class CustomFieldType(StrEnum):
    """The type of the custom field."""

    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


V = te.TypeVar("V", default=Any)


class CustomField(CommonGrantsBaseModel, Generic[V]):
    """A custom field with type information and a typed value.

    Generic over its value type ``V`` (default ``Any``): the bare ``CustomField``
    keeps the protocol's untyped-value behavior, while ``CustomField[int]`` (or a
    Pydantic model) gives plugin authors and consumers a concrete, inspectable
    ``value`` type. ``populate_by_name`` plus ``validation_alias``/
    ``serialization_alias`` keep JSON I/O camelCase (``fieldType``) while
    snake_case field-name construction (``CustomField(field_type=...)``) type-checks.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(
        ...,
        description="Name of the custom field",
        min_length=1,
    )
    field_type: CustomFieldType = Field(
        ...,
        validation_alias="fieldType",
        serialization_alias="fieldType",
        description="The JSON schema type to use when de-serializing the `value` field",
    )
    schema_url: Optional[HttpUrl] = Field(
        None,
        validation_alias="schema",
        serialization_alias="schema",
        description="Link to the full JSON schema for this custom field",
    )
    value: V = Field(..., description="Value of the custom field")
    description: Optional[str] = Field(
        None,
        description="Description of the custom field's purpose",
    )


__all__ = [
    "CustomFieldType",
    "CustomField",
]
