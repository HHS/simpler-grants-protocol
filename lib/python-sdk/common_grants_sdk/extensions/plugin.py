"""Plugin configuration and composition APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Generic, TypeVar

from .types import (
    ClientConfig,
    ObjectSchemas,
    ObjectSchemasInput,
    PluginExtensions,
    PluginExtensionsMeta,
)

T = TypeVar("T")


@dataclass(frozen=True)
class PluginConfig:
    """Build-time plugin config discoverable by the code generator.

    All fields are optional. Passed to generate.py which compiles it into
    a fully resolved Plugin instance (with ObjectSchemas, memoized get_client).
    """

    extensions: PluginExtensions | None = None
    meta: PluginExtensionsMeta | None = None
    schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None
    get_client: Callable[[ClientConfig], Any] | None = None
    filters: dict[str, Any] | None = None


@dataclass
class Plugin(Generic[T]):
    """Runtime plugin container assembled by generate.py after code generation.

    generated_schemas: typed _Schemas object from generate.py (attribute access
        to generated Pydantic model classes, e.g. plugin.generated_schemas.Opportunity).
    schemas: compiled dict[str, ObjectSchemas] for bidirectional transforms.
        Named 'schemas' per ADR-0022. Distinct from generated_schemas.
    """

    generated_schemas: T
    extensions: PluginExtensions | None = None
    meta: PluginExtensionsMeta | None = None
    get_client: Callable[[ClientConfig], Any] | None = None
    schemas: dict[str, ObjectSchemas[Any, Any]] | None = None
    filters: dict[str, Any] | None = None


def define_plugin(
    meta: PluginExtensionsMeta | None = None,
    get_client: Callable[[ClientConfig], Any] | None = None,
    extensions: PluginExtensions | None = None,
    schemas: dict[str, ObjectSchemasInput[Any, Any]] | None = None,
    filters: dict[str, Any] | None = None,
) -> PluginConfig:
    """Create a PluginConfig consumed by the code generator.

    No compilation occurs here — inputs are stored as-is. The code generator
    (generate.py) compiles ObjectSchemasInput → ObjectSchemas by injecting
    the common model from the generated schemas, and wraps get_client with
    functools.lru_cache.
    """
    return PluginConfig(
        extensions=extensions,
        meta=meta,
        schemas=schemas,
        get_client=get_client,
        filters=filters,
    )
