from typing import Optional, Any, Type, TypeVar
from pydantic import BaseModel, Field, create_model, ConfigDict
from ..schemas.pydantic.fields import CustomField, CustomFieldType
from ..schemas.pydantic.base import CommonGrantsBaseModel
from common_grants_sdk.utils.json import snake
from common_grants_sdk.extensions.specs import CustomFieldSpec

T = TypeVar("T", bound=BaseModel)

# Map CustomFieldType to Python types
FIELD_TYPE_MAP: dict[CustomFieldType, type] = {
    CustomFieldType.STRING: str,
    CustomFieldType.NUMBER: float,
    CustomFieldType.INTEGER: int,
    CustomFieldType.BOOLEAN: bool,
    CustomFieldType.OBJECT: dict,
    CustomFieldType.ARRAY: list,
}


def add_custom_fields(
    cls: Type[T], model_name: str, fields: list[CustomFieldSpec]
) -> Type[T]:
    """Adds custom fields to any pydantic model object.

    Args:
        cls: The base Pydantic model class to extend
        key: The custom field key name
        field_type: The type of the custom field
        value_model: Optional type for the field's value
        model_name: Optional name for the generated model

    Returns:
        A new model class extending cls with the custom field
    """
    name = model_name or f"{cls.__name__}WithCustomFields"

    # Accumulate all field definitions
    field_defs: dict[str, Any] = {}

    for field in fields:
        py_attr = snake(field.key)

        # Build a per-custom-field model so `.value` is typed
        value_type = FIELD_TYPE_MAP.get(field.field_type, Any)

        CustomFieldForAttr = create_model(
            f"{name}{field.key[:1].upper()}{field.key[1:]}Field",
            __base__=CustomField,
            # pin expected type (still accepts wire key "type" via alias)
            field_type=(CustomFieldType, Field(default=field.field_type, alias="type")),
            # typed value (Optional[...] to allow missing)
            value=(Optional[value_type], None),
        )

        # Add this field's definition to the accumulator
        field_defs[py_attr] = (
            Optional[CustomFieldForAttr],
            Field(default=None, alias=field.key),
        )

    # Unknown keys ignored for now.
    # TODO: switch extra="allow" + add validator to parse extras into CustomField
    class _CustomFieldsBase(CommonGrantsBaseModel):
        model_config = ConfigDict(populate_by_name=True, extra="ignore")

    # Create container with ALL accumulated field definitions
    CustomFieldsContainer = create_model(
        f"{name}CustomFields",
        __base__=_CustomFieldsBase,
        **field_defs,
    )

    # Extended opportunity model
    return create_model(
        name,
        __base__=cls,
        custom_fields=(
            Optional[CustomFieldsContainer],
            Field(default=None, alias="customFields"),
        ),
    )
