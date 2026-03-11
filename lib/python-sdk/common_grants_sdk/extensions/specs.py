"""Extension types and utilities for SDK schema customization."""

from dataclasses import dataclass
from typing import Any, Literal, Optional, TypedDict, cast

from ..schemas.pydantic.fields.custom import CustomFieldType

ConflictStrategy = Literal["error", "first_wins", "last_wins"]


@dataclass
class CustomFieldSpec:
    """Custom Field spec class to support adding custom fields"""

    field_type: CustomFieldType
    value: Optional[Any] = None
    name: str = ""
    description: str = ""


class SchemaExtensions(TypedDict, total=False):
    """Maps extensible model names to custom field specifications."""

    Opportunity: dict[str, CustomFieldSpec]
    Application: dict[str, CustomFieldSpec]


def merge_extensions(
    sources: list[SchemaExtensions], on_conflict: ConflictStrategy = "error"
) -> SchemaExtensions:
    """Merge multiple extension sources into one schema extension mapping.

    Args:
        sources: Ordered list of extension mappings to merge.
        on_conflict: Duplicate field strategy per model.
            - ``"error"``: raise on duplicate field name.
            - ``"first_wins"``: keep first seen definition.
            - ``"last_wins"``: overwrite with latest definition.
    """
    if on_conflict not in {"error", "first_wins", "last_wins"}:
        raise ValueError(
            'merge_extensions: on_conflict must be "error", "first_wins", or "last_wins"'
        )

    if len(sources) == 0:
        return {}
    if len(sources) == 1:
        return sources[0]

    result: dict[str, dict[str, CustomFieldSpec]] = {}

    for source in sources:
        for model_name, source_fields in source.items():
            model_fields = result.setdefault(model_name, {})
            for field_name, spec in source_fields.items():
                if field_name in model_fields:
                    if on_conflict == "error":
                        raise ValueError(
                            f'merge_extensions: duplicate field "{field_name}" on model "{model_name}"'
                        )
                    if on_conflict == "first_wins":
                        continue
                model_fields[field_name] = spec

    return cast(SchemaExtensions, result)
