"""Public extension APIs for the CommonGrants Python SDK."""

from .filters import classify_filters, f, validate_routes
from .plugin import Plugin, PluginConfig, define_plugin, inject_transforms
from .specs import (
    ConflictStrategy,
    CustomFieldSpec,
    CustomFilterSpec,
    CustomFilterType,
    SchemaExtensions,
    merge_extensions,
)
from .transforms import build_transforms
from .types import (
    Handler,
    ObjectMappings,
    ObjectSchemas,
    ObjectSchemasInput,
    PluginCapability,
    PluginError,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
    PluginRoutes,
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
    "inject_transforms",
    "merge_extensions",
    # New: build_transforms
    "build_transforms",
    # New: ADR-0022 types
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
    # New: custom filters (plan 03)
    "classify_filters",
    "CustomFilterSpec",
    "CustomFilterType",
    "f",
    "PluginRoutes",
    "validate_routes",
]
