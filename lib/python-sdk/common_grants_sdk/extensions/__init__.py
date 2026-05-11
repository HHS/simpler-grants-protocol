"""Public extension APIs for the CommonGrants Python SDK."""

from .plugin import Plugin, PluginConfig, define_plugin
from .specs import ConflictStrategy, CustomFieldSpec, SchemaExtensions, merge_extensions
from .transforms import build_transforms
from .types import (
    ClientConfig,
    Handler,
    ObjectMappings,
    ObjectSchemas,
    ObjectSchemasInput,
    PluginCapability,
    PluginError,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
    TransformResult,
)

__all__ = [
    # Existing exports (unchanged)
    "ConflictStrategy",
    "CustomFieldSpec",
    "Plugin",
    "PluginConfig",
    "SchemaExtensions",
    "define_plugin",
    "merge_extensions",
    # New: build_transforms
    "build_transforms",
    # New: ADR-0022 types
    "ClientConfig",
    "Handler",
    "ObjectMappings",
    "ObjectSchemas",
    "ObjectSchemasInput",
    "PluginCapability",
    "PluginError",
    "PluginExtensions",
    "PluginExtensionsMeta",
    "PluginExtensionsSchema",
    "TransformResult",
]
