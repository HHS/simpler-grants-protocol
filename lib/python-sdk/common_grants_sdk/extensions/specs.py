"""Extension types and utilities for SDK schema customization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Optional, TypedDict

from ..schemas.pydantic.fields.custom import CustomFieldType

ConflictStrategy = Literal["error", "first_wins", "last_wins"]


@dataclass
class CustomFieldSpec:
    """Runtime custom-field declaration consumed by the registration path.

    Used by ``utils.custom_fields.add_custom_fields`` (and
    ``OpportunityBase.with_custom_fields``) to build a typed custom-fields container
    at runtime. ``field_type`` is a required input here: it selects the value type
    when ``value`` is not given, and is pinned on the resulting ``CustomField``.
    """

    field_type: CustomFieldType
    value: Optional[Any] = None
    name: str = ""
    description: str = ""


@dataclass
class PluginCustomFieldSpec:
    """Resolved, inspection-only view of a single custom field.

    Mirrors the field shape of :class:`CustomFieldSpec`, but authors never construct
    it. The ``schema(...)`` factory produces it via ``resolve_custom_field_specs``
    from a ``CustomField[V]`` declaration on a ``CustomFieldSet``, and exposes it to
    consumers through ``extension.custom_fields`` so they can introspect each field
    without it ever drifting from the typed declaration:

    - ``field_type`` -- the JSON-schema tag derived from ``V`` (``str -> string``,
      a Pydantic model -> ``object``, ...); ``None`` when ``V`` cannot be mapped.
    - ``value`` -- the static value type ``V`` itself, for runtime inspection.
    - ``name`` -- the attribute name on the container.
    - ``description`` -- the Pydantic field description.
    """

    field_type: Optional[CustomFieldType] = None
    value: Optional[Any] = None
    name: str = ""
    description: str = ""


class SchemaExtensions(TypedDict, total=False):
    """Maps extensible model names to custom field specifications."""

    Opportunity: dict[str, CustomFieldSpec]
