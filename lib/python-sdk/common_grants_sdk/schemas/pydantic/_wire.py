"""Wire policy shared by the SDK's model bases.

Private module: ``base.py`` is star-exported through the schema barrels, so the
policy lives here to keep it, and the names it imports, off the public surface.
"""

from typing import Any, ClassVar

from pydantic import (
    BaseModel,
    ModelWrapValidatorHandler,
    SerializationInfo,
    SerializerFunctionWrapHandler,
    model_serializer,
    model_validator,
)


class OmitNullOptionals(BaseModel):
    """Never writes ``null`` for an optional field.

    Core optional properties may be omitted but are never ``null``, so every dump
    (``model_dump`` and ``model_dump_json`` with any flags, ``dump()``,
    ``dump_json()``, FastAPI responses) leaves out an optional field whose value is
    ``None``, whether it was set or defaulted. Required fields keep their value, so
    a required ``CustomField.value`` still writes ``null``. ``_wire_required_fields``
    names fields Core requires that a subclass may default, which are written even
    when ``None``.

    Validating another SDK model's instance reads it through that wire dump.
    """

    _wire_required_fields: ClassVar[frozenset[str]] = frozenset()

    # Another SDK model is read through its wire dump, not its attributes: an
    # unset optional attribute reads as None, which sealed fields reject.
    @model_validator(mode="wrap")
    @classmethod
    def _from_other_sdk_model(
        cls, data: Any, handler: ModelWrapValidatorHandler[Any]
    ) -> Any:
        if isinstance(data, OmitNullOptionals) and not isinstance(data, cls):
            data = data.model_dump(mode="json", by_alias=True, exclude_unset=True)
        return handler(data)

    # No return annotation: one would replace this model's serialization JSON
    # schema, and FastAPI's response schemas, with the annotated type.
    @model_serializer(mode="wrap")
    def _omit_null_optionals(
        self, handler: SerializerFunctionWrapHandler, info: SerializationInfo
    ):
        data = handler(self)
        if isinstance(data, dict):
            for name, field in type(self).model_fields.items():
                key = (field.serialization_alias or name) if info.by_alias else name
                if (
                    data.get(key, ...) is None
                    and not field.is_required()
                    and name not in self._wire_required_fields
                ):
                    del data[key]
        return data
