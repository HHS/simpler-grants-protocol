"""Plugin configuration and composition APIs."""

from dataclasses import dataclass
from typing import Any

from .extensions import ConflictStrategy, SchemaExtensions, merge_extensions


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


def compose(
    sources: list[SchemaExtensions], on_conflict: ConflictStrategy = "error"
) -> SchemaExtensions:
    """Merge extension sources into one extension mapping."""
    return merge_extensions(sources=sources, on_conflict=on_conflict)
