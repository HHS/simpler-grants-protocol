"""Plugin configuration and composition APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar, overload

from .types import PluginExtensionsMeta, PluginRoutes

T = TypeVar("T")
TSchemas = TypeVar("TSchemas")
_TSchemasContainer = TypeVar("_TSchemasContainer")


@dataclass(frozen=True)
class PluginConfig(Generic[TSchemas]):
    """Build-time plugin config produced by define_plugin() and consumed by generate.py.

    Generic on TSchemas so the precise type of the schemas dict is preserved — e.g.
    PluginConfig[dict[str, SchemaInput[MyNative, MyCg]]] — rather than being
    widened to SchemaInput[Any, Any] at the storage boundary.

    Stores inputs as-is — no compilation occurs at define_plugin() call time.
    generate.py compiles this into a fully resolved Plugin by injecting the generated
    Pydantic model class as the common schema for each SchemaInput entry, and
    auto-generating build_transforms() calls for any object that has
    schemas[obj].mappings but no explicit schemas[obj].to_common / from_common.

    All fields are optional so adopters can start with only what they need.
    """

    meta: PluginExtensionsMeta | None = None
    schemas: TSchemas | None = None
    routes: PluginRoutes | None = None


@dataclass
class Plugin(Generic[T]):
    """Runtime plugin container assembled by generate.py after code generation.

    schemas: the _Schemas object from generated/schemas.py. Each attribute is a
        SchemaConfig instance providing unified access to the model class and
        transforms for that object:
          plugin.schemas.Opportunity.common_schema → the Pydantic model class (includes
                                                     any custom fields declared by the plugin)
          plugin.schemas.Opportunity.to_common     → transform callable (or None)
          plugin.schemas.Opportunity.from_common   → transform callable (or None)
          plugin.schemas.Opportunity.source_schema → the source system's type (or dict)
    """

    schemas: T
    meta: PluginExtensionsMeta | None = None


@overload
def define_plugin(
    meta: PluginExtensionsMeta | None = ...,
    schemas: None = ...,
    routes: PluginRoutes | None = ...,
) -> PluginConfig[None]: ...


@overload
def define_plugin(
    meta: PluginExtensionsMeta | None = ...,
    schemas: TSchemas = ...,
    routes: PluginRoutes | None = ...,
) -> PluginConfig[TSchemas]: ...


def define_plugin(
    meta: PluginExtensionsMeta | None = None,
    schemas: Any = None,
    routes: PluginRoutes | None = None,
) -> PluginConfig[Any]:
    """Create a PluginConfig from plugin declarations.

    Schema inputs are consumed by the code generator; route-keyed filter
    declarations are consumed by the runtime filter engine (extensions/filters.py).

    No compilation occurs here — inputs are stored as-is. The code generator
    (generate.py) compiles SchemaInput → SchemaConfig by injecting
    the common model from the generated schemas, and auto-wires build_transforms()
    for any object that has schemas[obj].mappings but no explicit callables.

    The return type is generic on the schemas argument: passing a typed dict
    (e.g. {"Opportunity": SchemaInput[MyNative, MyCg](...) }) preserves
    those per-object generics on the returned PluginConfig rather than widening
    them to Any.

    routes: optional route-keyed custom-filter declarations.
        Shape: {resourceName: {methodName: {filterName: CustomFilterSpec}}}.
        Passed through to PluginConfig.routes unvalidated. Registration-time
        validation is explicit: call validate_routes() (extensions/filters.py)
        on the declarations, e.g. at plugin startup. classify_filters() does
        not invoke it; route validation is a standalone check.

    Raises:
        ValueError: If any schema entry specifies both mappings and explicit
            to_common/from_common callables (XOR constraint).
    """
    if schemas:
        for obj_name, schema_input in schemas.items():
            has_mappings = schema_input.mappings is not None
            has_callables = (
                schema_input.to_common is not None
                or schema_input.from_common is not None
            )
            if has_mappings and has_callables:
                raise ValueError(
                    f"define_plugin: {obj_name} cannot specify both mappings and explicit "
                    f"to_common/from_common. "
                    f"Use mappings for declarative transforms or provide explicit callables, not both."
                )
    return PluginConfig(
        meta=meta,
        schemas=schemas,
        routes=routes,
    )


def inject_transforms(
    config: PluginConfig[Any], schemas: _TSchemasContainer
) -> _TSchemasContainer:
    """Wire transform callables from plugin config into the generated schemas container.

    Called by the generated plugin __init__.py to inject to_common/from_common
    callables (and the native type) from cg_config into the SchemaConfig instances
    produced by the code generator.

    Iterates over all entries in config.schemas that have at least one callable,
    validates that both directions are present, then sets the attributes on the
    matching schemas container attribute (e.g. schemas.Opportunity).

    Returns the same schemas container (mutated in place) so callers can write
    ``schemas = inject_transforms(config, schemas)`` and retain the concrete
    generated type rather than widening to Any.

    Args:
        config: The PluginConfig produced by define_plugin().
        schemas: The generated _Schemas container from generated/schemas.py.

    Returns:
        The same schemas container, with transform callables injected.

    Raises:
        ValueError: If a schema with any callable is missing its counterpart,
            or if the object name is not found in the schemas container.
    """
    if not config.schemas:
        return schemas
    for obj_name, schema_input in config.schemas.items():
        if schema_input.to_common is None and schema_input.from_common is None:
            continue
        obj_schemas = getattr(schemas, obj_name, None)
        if obj_schemas is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: not found in generated schemas"
            )
        if schema_input.to_common is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: to_common callable is required"
            )
        if schema_input.from_common is None:
            raise ValueError(
                f"Plugin object {obj_name!r}: from_common callable is required"
            )
        obj_schemas.source_schema = schema_input.source_schema or dict
        obj_schemas.to_common = schema_input.to_common
        obj_schemas.from_common = schema_input.from_common
    return schemas
