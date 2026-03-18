"""Plugin configuration and composition APIs."""

from dataclasses import dataclass
from typing import Any

from .specs import SchemaExtensions


@dataclass(frozen=True)
class PluginConfig:
    """Build-time plugin config discoverable by the generator."""

    extensions: SchemaExtensions


@dataclass(frozen=True)
class Plugin:
    """Runtime plugin container with both extension specs and generated schemas."""

    extensions: SchemaExtensions
    schemas: Any


def define_plugin(extensions: SchemaExtensions) -> PluginConfig:
    """Create a plugin config object consumed by the code generator."""
    return PluginConfig(extensions=extensions)
