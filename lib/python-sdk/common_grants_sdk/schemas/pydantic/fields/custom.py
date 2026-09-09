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
    ``value`` type. Wire naming comes from the base alias generator (camelCase
    ``fieldType`` on the wire, ``CustomField(field_type=...)`` in code); the one
    irregular wire name, ``schema_url`` -> ``"schema"``, keeps an explicit
    field-level alias.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(
        ...,
        description="Name of the custom field",
        min_length=1,
    )
    field_type: CustomFieldType = Field(
        ...,
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
