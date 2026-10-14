"""Local Core-contract policies for models that opt in.

Private module: the policies are applied model by model, never through
``CommonGrantsBaseModel``, so models that have not been aligned with Core keep
their existing behavior.
"""

from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, ValidationInfo, field_validator

from .base import CommonGrantsBaseModel


class NonNullOptionals(BaseModel):
    """Rejects an explicit null for optional fields: optional is not nullable.

    Core optional properties may be omitted but are never ``null``. An absent field
    still defaults to ``None`` (defaults are not validated), so this only fires when
    a caller supplies ``None`` -- by wire key, field name, or constructor keyword.
    Required fields keep their own types, so a required ``Any`` such as
    ``CustomField.value`` still accepts ``null``. ``_nullable_fields`` names optional
    fields that may be null anyway.
    """

    _nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @field_validator("*", mode="before")
    @classmethod
    def _reject_explicit_null(cls, value: Any, info: ValidationInfo) -> Any:
        name = info.field_name
        if (
            value is None
            and name is not None
            and name not in cls._nullable_fields
            and not cls.model_fields[name].is_required()
        ):
            raise ValueError("optional property must be omitted, not null")
        return value


class SealedModel(NonNullOptionals, CommonGrantsBaseModel):
    """A closed Core object: unknown properties are rejected, not dropped, and
    optional properties may be omitted but not null."""

    model_config = ConfigDict(extra="forbid")
