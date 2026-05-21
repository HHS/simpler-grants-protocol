"""Plugin configuration and composition APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar, overload

from .types import (
    PluginExtensions,
    PluginExtensionsMeta,
)

T = TypeVar("T")
TSchemas = TypeVar("TSchemas")
_TSchemasContainer = TypeVar("_TSchemasContainer")


@dataclass(frozen=True)
class PluginConfig(Generic[TSchemas]):
    """Build-time plugin config produced by define_plugin() and consumed by generate.py.

    Generic on TSchemas so the precise type of the schemas dict is preserved — e.g.
    PluginConfig[dict[str, ObjectSchemasInput[MyNative, MyCg]]] — rather than being
    widened to ObjectSchemasInput[Any, Any] at the storage boundary.

    Stores inputs as-is — no compilation occurs at define_plugin() call time.
    generate.py compiles this into a fully resolved Plugin by:
    - Injecting the generated Pydantic model class as the common schema for each
      ObjectSchemasInput entry (schemas[obj].native + common → ObjectSchemas).
    - Auto-generating build_transforms() calls for any object that has
      extensions.schemas[obj].mappings but no explicit schemas[obj] entry.

    All fields are optional so adopters can start with only what they need.
    """

    extensions: PluginExtensions | None = None
    meta: PluginExtensionsMeta | None = None
    schemas: TSchemas | None = None


@dataclass
class Plugin(Generic[T]):
    """Runtime plugin container assembled by generate.py after code generation.

    schemas: the _Schemas object from generated/schemas.py. Each attribute is an
        ObjectSchemas instance providing unified access to the model class and
        transforms for that object:
          plugin.schemas.Opportunity.common      → the Pydantic model class (includes
                                                   any custom fields declared by the plugin)
          plugin.schemas.Opportunity.to_common   → transform callable (or None)
          plugin.schemas.Opportunity.from_common → transform callable (or None)
          plugin.schemas.Opportunity.native      → the source system's type (or dict)
    """

    schemas: T
    extensions: PluginExtensions | None = None
    meta: PluginExtensionsMeta | None = None


@overload
def define_plugin(
    meta: PluginExtensionsMeta | None = ...,
    extensions: PluginExtensions | None = ...,
    schemas: None = ...,
) -> PluginConfig[None]: ...


@overload
def define_plugin(
    meta: PluginExtensionsMeta | None = ...,
    extensions: PluginExtensions | None = ...,
    schemas: TSchemas = ...,
) -> PluginConfig[TSchemas]: ...


def define_plugin(
    meta: PluginExtensionsMeta | None = None,
    extensions: PluginExtensions | None = None,
    schemas: Any = None,
) -> PluginConfig[Any]:
    """Create a PluginConfig consumed by the code generator.

    No compilation occurs here — inputs are stored as-is. The code generator
    (generate.py) compiles ObjectSchemasInput → ObjectSchemas by injecting
    the common model from the generated schemas.

    The return type is generic on the schemas argument: passing a typed dict
    (e.g. {"Opportunity": ObjectSchemasInput[MyNative, MyCg](...) }) preserves
    those per-object generics on the returned PluginConfig rather than widening
    them to Any.
    """
    return PluginConfig(
        extensions=extensions,
        meta=meta,
        schemas=schemas,
    )


def inject_transforms(
    config: PluginConfig[Any], schemas: _TSchemasContainer
) -> _TSchemasContainer:
    """Wire transform callables from plugin config into the generated schemas container.

    Called by the generated plugin __init__.py to inject to_common/from_common
    callables (and the native type) from cg_config into the ObjectSchemas instances
    produced by the code generator.

    Iterates over all entries in config.schemas that have at least one callable,
    validates that both directions are present, then sets the attributes on the
    matching schemas container attribute (e.g. schemas.Opportunity).

    Returns the same schemas container (mutated in place) so callers can write
    ``schemas = inject_transforms(config, schemas)`` and retain the concrete
    generated type rather than widening to Any.

    Args:
        config: The PluginConfig produced by define_plugin().
        schemas: The generated _Schemas container from generated/schemas.py.

    Returns:
        The same schemas container, with transform callables injected.

    Raises:
        ValueError: If a schema with any callable is missing its counterpart,
            or if the object name is not found in the schemas container.
    """
    if not config.schemas:
        return schemas
    for obj_name, schema_input in config.schemas.items():
        if schema_input.to_common is None and schema_input.from_common is None:
            continue
        obj_schemas = getattr(schemas, obj_name, None)
        if obj_schemas is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: not found in generated schemas"
            )
        if schema_input.to_common is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: to_common callable is required"
            )
        if schema_input.from_common is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: from_common callable is required"
            )
        obj_schemas.native = schema_input.native or dict
        obj_schemas.to_common = schema_input.to_common
        obj_schemas.from_common = schema_input.from_common
    return schemas
