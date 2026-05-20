"""Plugin configuration and composition APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from .types import (
    ObjectSchemasInput,
    PluginExtensions,
    PluginExtensionsMeta,
)

T = TypeVar("T")


@dataclass(frozen=True)
class PluginConfig:
    """Build-time plugin config produced by define_plugin() and consumed by generate.py.

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
    schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None


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


def define_plugin(
    meta: PluginExtensionsMeta | None = None,
    extensions: PluginExtensions | None = None,
    schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None,
) -> PluginConfig:
    """Create a PluginConfig consumed by the code generator.

    No compilation occurs here — inputs are stored as-is. The code generator
    (generate.py) compiles ObjectSchemasInput → ObjectSchemas by injecting
    the common model from the generated schemas.
    """
    return PluginConfig(
        extensions=extensions,
        meta=meta,
        schemas=schemas,
    )
