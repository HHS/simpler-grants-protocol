"""Plugin configuration and composition APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Generic, TypeVar

from .specs import SchemaExtensions
from .types import ClientConfig, ObjectSchemas, ObjectSchemasInput, PluginExtensionsMeta

T = TypeVar("T")


@dataclass(frozen=True)
class PluginConfig:
    """Build-time plugin config discoverable by the code generator.

    extensions: custom field declarations (read by generate.py — do not rename).
    meta: optional plugin identity and capability declaration.
    transform_schemas: optional bidirectional transform callables per object.
        Stored as ObjectSchemasInput (not compiled to ObjectSchemas) in the PoC.
        Full compilation with model_validate wrapping is a TODO for the real SDK.

    TODO (full SDK): add get_client, filters.
    """

    extensions: SchemaExtensions
    meta: PluginExtensionsMeta | None = None
    transform_schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None


@dataclass
class Plugin(Generic[T]):
    """Runtime plugin container with extension specs and generated schemas.

    extensions: SchemaExtensions used by generate.py (do not rename or reorder —
        the generated __init__.py constructs Plugin(extensions=..., schemas=...)).
    schemas: generated _Schemas object (typed Pydantic model classes from generate.py).
        NOTE: there is a naming collision: ADR-0022 also calls its runtime transform
        dict "schemas". These are different concepts sharing the same name — a design
        question to resolve in the full SDK (see Design Finding #1 in the spec).
    transform_schemas: ADR-0022 runtime transform dict; named distinctly from
        `schemas` to avoid collision with the generated schemas field in the PoC.

    TODO (full SDK): memoize get_client.
    """

    extensions: SchemaExtensions
    schemas: T  # generated _Schemas object — keep as positional for generate.py compat
    meta: PluginExtensionsMeta | None = None
    get_client: Callable[[ClientConfig], Any] | None = None  # TODO: memoize
    # PoC stores ObjectSchemasInput here (no compilation yet); full SDK will store
    # ObjectSchemas after model_validate wrapping. Annotated as the union so both
    # the current PoC usage and the future compiled form are type-safe.
    transform_schemas: (
        dict[str, ObjectSchemasInput[Any, Any] | ObjectSchemas[Any, Any]] | None
    ) = None
    filters: dict[str, dict[str, Any]] | None = None


def define_plugin(
    extensions: SchemaExtensions,
    meta: PluginExtensionsMeta | None = None,
    transform_schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None,
    # TODO (full SDK): get_client, filters
) -> PluginConfig:
    """Create a PluginConfig object consumed by the code generator.

    Backward-compatible: existing callers passing only `extensions` are unaffected.
    New params are stored as-is — no compilation occurs in the PoC.

    TODO (full SDK):
        - Auto-generate transforms from extensions.schemas[obj].mappings when no
          explicit to_common/from_common is supplied.
        - Wrap transform output with model_validate.
    """
    return PluginConfig(
        extensions=extensions,
        meta=meta,
        transform_schemas=transform_schemas,
    )
