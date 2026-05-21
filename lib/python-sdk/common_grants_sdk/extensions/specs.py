"""Extension types and utilities for SDK schema customization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal, Optional, TypedDict

from ..schemas.pydantic.fields.custom import CustomFieldType

if TYPE_CHECKING:
    from .types import (
        PluginExtensions,
        PluginExtensionsMeta,
    )

ConflictStrategy = Literal["error", "first_wins", "last_wins"]


@dataclass
class CustomFieldSpec:
    """Custom Field spec class to support adding custom fields"""

    field_type: CustomFieldType
    value: Optional[Any] = None
    name: str = ""
    description: str = ""


class SchemaExtensions(TypedDict, total=False):
    """Maps extensible model names to custom field specifications.

    Retained for callers that still use the flat TypedDict form directly.
    merge_extensions now accepts PluginExtensions instead.
    """

    Opportunity: dict[str, CustomFieldSpec]


def _merge_meta(
    current: PluginExtensionsMeta | None,
    incoming: PluginExtensionsMeta,
    on_conflict: ConflictStrategy,
) -> PluginExtensionsMeta:
    """Merge incoming meta into current, respecting on_conflict for non-None field collisions."""
    from .types import PluginExtensionsMeta as _PluginExtensionsMeta

    if current is None:
        return incoming

    merged: dict[str, Any] = {}
    for field_name in ("name", "version", "source_system", "capabilities"):
        current_val = getattr(current, field_name)
        incoming_val = getattr(incoming, field_name)

        if incoming_val is None:
            merged[field_name] = current_val
        elif current_val is None:
            merged[field_name] = incoming_val
        else:
            # Both have non-None values — apply conflict strategy
            if on_conflict == "error":
                raise ValueError(
                    f'merge_extensions: duplicate meta field "{field_name}" '
                    f"(existing: {current_val!r}, incoming: {incoming_val!r})"
                )
            merged[field_name] = (
                current_val if on_conflict == "first_wins" else incoming_val
            )

    return _PluginExtensionsMeta(
        name=merged["name"],
        version=merged["version"],
        sourceSystem=merged["source_system"],
        capabilities=merged["capabilities"],
    )


def merge_extensions(
    sources: list[PluginExtensions], on_conflict: ConflictStrategy = "error"
) -> PluginExtensions:
    """Merge multiple PluginExtensions into one.

    Args:
        sources: Ordered list of PluginExtensions to merge.
        on_conflict: Strategy for duplicate field names per object.
            - "error": raise on first duplicate (default).
            - "first_wins": keep first seen value.
            - "last_wins": overwrite with latest value.
    """
    from .types import ObjectMappings as _ObjectMappings
    from .types import PluginExtensions as _PluginExtensions
    from .types import PluginExtensionsSchema as _PluginExtensionsSchema

    if on_conflict not in {"error", "first_wins", "last_wins"}:
        raise ValueError(
            'merge_extensions: on_conflict must be "error", "first_wins", or "last_wins"'
        )

    if len(sources) == 0:
        return _PluginExtensions()
    if len(sources) == 1:
        return sources[0]

    # Accumulate into plain dicts; construct PluginExtensions once at the end.
    merged_mappings: dict[str, _ObjectMappings] = {}
    merged_meta: PluginExtensionsMeta | None = None

    for source in sources:
        if source.schemas:
            for obj, src_schema in source.schemas.items():
                if src_schema.mappings:
                    if obj in merged_mappings:
                        if on_conflict == "error":
                            raise ValueError(
                                f'merge_extensions: duplicate mappings for object "{obj}"'
                            )
                        if on_conflict == "first_wins":
                            continue
                    merged_mappings[obj] = src_schema.mappings
        if source.meta:
            merged_meta = _merge_meta(merged_meta, source.meta, on_conflict)

    return _PluginExtensions(
        meta=merged_meta,
        schemas=(
            {
                obj: _PluginExtensionsSchema(
                    mappings=merged_mappings.get(obj),
                )
                for obj in merged_mappings
            }
            if merged_mappings
            else None
        ),
    )
