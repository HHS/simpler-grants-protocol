"""Local Core-contract policies for models that opt in.

Private module: the policies are applied model by model, never through
``CommonGrantsBaseModel``, so models that have not been aligned with Core keep
their existing behavior.
"""

from functools import cache
from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, model_validator

from .base import CommonGrantsBaseModel


class NonNullOptionals(BaseModel):
    """Reads an explicit null for an optional field as omitted.

    Core optional properties may be omitted but are never ``null``. A ``None``
    supplied for one -- by wire key, field name, or constructor keyword -- is
    dropped before validation, so the field stays unset and the wire recipe
    (``exclude_unset=True``) leaves it out. Required fields keep their own types,
    so a required ``Any`` such as ``CustomField.value`` still accepts ``null``.
    ``_nullable_fields`` names optional fields whose ``null`` is kept as a value.
    """

    _nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="before")
    @classmethod
    def _null_as_omitted(cls, data: Any) -> Any:
        if isinstance(data, dict) and any(value is None for value in data.values()):
            keys = _omittable_keys(cls)
            return {k: v for k, v in data.items() if v is not None or k not in keys}
        return data


@cache
def _omittable_keys(cls: type[NonNullOptionals]) -> frozenset[str]:
    """Field names and wire keys of the optional fields whose null reads as omitted."""
    keys: set[str] = set()
    for name, field in cls.model_fields.items():
        if field.is_required() or name in cls._nullable_fields:
            continue
        keys.add(name)
        keys.update(
            alias
            for alias in (field.alias, field.validation_alias)
            if isinstance(alias, str)
        )
    return frozenset(keys)


class SealedModel(NonNullOptionals, CommonGrantsBaseModel):
    """A closed Core object: unknown properties are rejected, not dropped, and an
    explicit null on an optional property reads as omitted."""

    model_config = ConfigDict(extra="forbid")
