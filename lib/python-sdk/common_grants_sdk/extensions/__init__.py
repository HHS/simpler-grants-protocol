"""Public extension APIs for the CommonGrants Python SDK."""

from .plugin import Plugin, PluginConfig, define_plugin
from .specs import ConflictStrategy, CustomFieldSpec, SchemaExtensions, merge_extensions

__all__ = [
    "ConflictStrategy",
    "CustomFieldSpec",
    "Plugin",
    "PluginConfig",
    "SchemaExtensions",
    "define_plugin",
    "merge_extensions",
]
