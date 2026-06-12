"""Public extension APIs for the CommonGrants Python SDK."""

from .plugin import Plugin, PluginConfig, define_plugin, inject_transforms
from .specs import ConflictStrategy, CustomFieldSpec, SchemaExtensions
from .transforms import build_transforms
from .types import (
    Handler,
    PluginCapability,
    PluginExtensionsMeta,
    SchemaConfig,
    SchemaInput,
    SchemaMappings,
    TransformError,
    TransformResult,
)

__all__ = [
    "ConflictStrategy",
    "CustomFieldSpec",
    "Plugin",
    "PluginConfig",
    "SchemaExtensions",
    "define_plugin",
    "inject_transforms",
    "build_transforms",
    "Handler",
    "PluginCapability",
    "PluginExtensionsMeta",
    "SchemaConfig",
    "SchemaInput",
    "SchemaMappings",
    "TransformError",
    "TransformResult",
]
