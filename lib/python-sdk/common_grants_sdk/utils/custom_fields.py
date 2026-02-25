from typing import Optional, Any, Type, TypeVar
from pydantic import BaseModel, Field, create_model, ConfigDict
from ..schemas.pydantic.fields import CustomField, CustomFieldType
from ..schemas.pydantic.base import CommonGrantsBaseModel
from common_grants_sdk.utils.json import snake
from common_grants_sdk.extensions.specs import CustomFieldSpec

T = TypeVar("T", bound=BaseModel)  # For add_custom_fields
V = TypeVar("V")  # For get_custom_field_value (unbound to support primitives)

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
    cls: Type[T], model_name: str, fields: dict[str, CustomFieldSpec]
) -> Type[T]:
    """Adds custom fields to any pydantic model object.

    Args:
        cls: The base Pydantic model class to extend
        model_name: Optional name for the generated model
        fields: Dict mapping field keys to CustomFieldSpec objects defining the shape of each field

    Returns:
        A new model class extending cls with the custom field
    """
    name = model_name or f"{cls.__name__}WithCustomFields"

    # Accumulate all field definitions
    field_defs: dict[str, Any] = create_custom_field_schema(name=name, fields=fields)

    # Unknown keys ignored for now.
    # TODO: switch extra="allow" + add validator to parse extras into CustomField
    class _CustomFieldsBase(CommonGrantsBaseModel):
        model_config = ConfigDict(populate_by_name=True, extra="ignore")

    # Create container with ALL accumulated field definitions,
    # this will be used when we recreate the base pydantic model with the
    # newly added custom fields in the return statement of this function
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


def create_custom_field_schema(
    name: str, fields: dict[str, CustomFieldSpec]
) -> dict[str, Any]:
    """Generates the needed pydantic classes from a dict of their specs that will get added to a new container.

    Args:
        name: The base pydantic class that will have custom fields added to it
        fields: Dict mapping field keys to CustomFieldSpec objects containing the shapes(schemas) of the custom fields to be added


    For each entry in the received dict the function loops through and performs the following operations
    1. Converts the field key to snake_case to be used as a python attribute name
    2. Creates a typed Pydantic model extending CustomField where:
        - 'field_type' is pinned to the spec's type(with alias 'type' for JSON)
        - 'value' is typed based on FIELD_TYPE_MAP (e.g. STRING -> str)
        - returns a field definition tuple suitable for Pydantic's create_model



    Example:
        Given::

            from common_grants_sdk.extensions.specs import CustomFieldSpec
            from common_grants_sdk.schemas.pydantic.fields import CustomFieldType

            field_defs = create_custom_field_schema(
                name="Opportunity",
                fields={
                    "legacyId": CustomFieldSpec(
                        field_type=CustomFieldType.INTEGER,
                        value=int,
                    ),
                },
            )

        The function creates an internal model per spec (e.g. ``OpportunityLegacyIdField``)
        and returns a dict like::

            {
                "legacy_id": (
                    Optional[OpportunityLegacyIdField], # Type of the field
                    Field(default=None, alias="legacyId"), # Field definition
                ),
            }

        Where the internal model looks like::

            class OpportunityLegacyIdField(CustomField):
                field_type: CustomFieldType = Field(default=CustomFieldType.INTEGER, alias="type")
                value: Optional[int] = None

        That dict can then be used with `create_model` to build a container
        and ultimately attached to a base model via `add_custom_fields`.
    """
    field_defs: dict[str, Any] = {}
    for key, field in fields.items():
        py_attr = snake(key)

        # Build a per-custom-field model so `.value` is typed
        value_type: Any = Any

        if field.value is not None:
            value_type = field.value
        else:
            value_type = FIELD_TYPE_MAP.get(field.field_type, Any)

        CustomFieldForAttr = create_model(
            _create_model_name(name=name, key=key),
            __base__=CustomField,
            # pin expected type (still accepts wire key "type" via alias)
            field_type=(CustomFieldType, Field(default=field.field_type, alias="type")),
            # typed value (Optional[...] to allow missing)
            value=(Optional[value_type], None),
        )

        # Add this field's definition to the accumulator
        field_defs[py_attr] = (
            Optional[CustomFieldForAttr],
            Field(default=None, alias=key),
        )

    return field_defs


def _create_model_name(name: str, key: str) -> str:
    """Capitalizes the first letter of key and combines it with the name prefix and the "Field" suffix"""
    return f"{name}{key[:1].upper()}{key[1:]}Field"


def get_custom_field_value(
    instance: BaseModel,
    key: str,
    value_type: Type[V],
) -> Optional[V]:
    """Retrieve custom field value from a pydantic model instance.

    Works regardless of whether custom fields were registered via
    `add_custom_fields` (Pydantic model) or are unregistered (dict).

    Args:
        instance: The model instance containing custom_fields
        key: The custom field key to retrieve
        value_type: The expected type (Pydantic BaseModel subclass or primitive)

    Returns:
        The typed value, or None if the key is not present

    Raises:
        ValueError: If the value is present but cannot be converted to value_type
    """
    fields = getattr(instance, "custom_fields", None)
    if fields is None:
        return None

    # Handle both dict (unregistered) and Pydantic model (registered) cases
    if isinstance(fields, dict):
        # Unregistered: custom_fields is dict[str, CustomField]
        if key not in fields:
            return None
        field = fields[key]
    else:
        # Registered: custom_fields is a Pydantic model with snake_case attributes
        attr_name = snake(key)
        field = getattr(fields, attr_name, None)
        if field is None:
            return None

    value = field.value
    if value is None:
        return None

    try:
        # if the fetched value already matches value_type, return it
        if isinstance(value, value_type):
            return value
        # if value_type is a Pydantic model: parse dict/other into model
        if issubclass(value_type, BaseModel):
            return value_type.model_validate(value)
        # if value_type is a primitive: raise an error (no attempted coercion)
        raise TypeError(f"expected {value_type.__name__}, got {type(value).__name__}")
    except Exception as e:
        raise ValueError(
            f"Custom field '{key}' has value {value!r} which cannot be converted to "
            f"{value_type.__name__}: {e}"
        ) from e
