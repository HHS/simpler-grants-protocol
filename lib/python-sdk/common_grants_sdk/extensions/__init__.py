"""Public extension APIs for the CommonGrants Python SDK."""

from .plugin import (
    Plugin,
    PluginMeta,
    PluginSchemas,
    define_plugin,
)
from .schema import (
    EXTENSIBLE_SCHEMA_MAP,
    CustomField,
    CustomFieldSet,
    NoCustomFields,
    PluginDefinitionError,
    SchemaOnly,
    SchemaWithTransforms,
    resolve_custom_field_specs,
    schema,
    validate_into,
)
from .specs import (
    ConflictStrategy,
    CustomFieldSpec,
    PluginCustomFieldSpec,
    SchemaExtensions,
)
from .transforms import build_transforms
from .types import (
    Handler,
    PassthroughModel,
    PluginCapability,
    TransformError,
    TransformResult,
)

__all__ = [
    "EXTENSIBLE_SCHEMA_MAP",
    "ConflictStrategy",
    "CustomField",
    "CustomFieldSet",
    "CustomFieldSpec",
    "Handler",
    "NoCustomFields",
    "PassthroughModel",
    "Plugin",
    "PluginCapability",
    "PluginCustomFieldSpec",
    "PluginDefinitionError",
    "PluginMeta",
    "PluginSchemas",
    "SchemaExtensions",
    "SchemaOnly",
    "TransformError",
    "SchemaWithTransforms",
    "TransformResult",
    "build_transforms",
    "define_plugin",
    "resolve_custom_field_specs",
    "schema",
    "validate_into",
]
