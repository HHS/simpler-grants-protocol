"""Plugin configuration and composition APIs."""

from dataclasses import dataclass
from typing import Generic, TypeVar

from .specs import SchemaExtensions

T = TypeVar("T")


@dataclass(frozen=True)
class PluginConfig:
    """Build-time plugin config discoverable by the generator."""

    extensions: SchemaExtensions


@dataclass(frozen=True)
class Plugin(Generic[T]):
    """Runtime plugin container with both extension specs and generated schemas."""

    extensions: SchemaExtensions
    schemas: T


def define_plugin(extensions: SchemaExtensions) -> PluginConfig:
    """Create a plugin config object consumed by the code generator."""
    return PluginConfig(extensions=extensions)
