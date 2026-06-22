"""Tests for plugin.py -- PluginSchemas / Plugin / define_plugin assembly."""

from typing import Optional

import pytest
from pydantic import Field

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PassthroughModel,
    Plugin,
    PluginMeta,
    PluginSchemas,
    ResourceRoutes,
    RouteFilters,
    Routes,
    SchemaOnly,
    SchemaWithTransforms,
    define_plugin,
    schema,
)
from common_grants_sdk.extensions.schema import PluginDefinitionError
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


class OppSearchFilters(OpportunityFilters, total=False):
    agency: StringArray


class OpportunityFields(CustomFieldSet):
    agency_code: Optional[CustomField[str]] = Field(
        default=None, description="Agency code"
    )


def _meta() -> PluginMeta:
    return PluginMeta(name="test", source_system="test-system")


# ---------------------------------------------------------------------------
# define_plugin assembly
# ---------------------------------------------------------------------------


def test_define_plugin_returns_plugin_with_schemas_and_meta():
    ext = schema(common_schema=OpportunityBase[OpportunityFields])
    plugin = define_plugin(PluginSchemas(Opportunity=ext), meta=_meta())
    assert isinstance(plugin, Plugin)
    assert plugin.schemas.Opportunity is ext
    assert plugin.meta.name == "test"
    assert plugin.meta.source_system == "test-system"


def test_omitted_schema_falls_back_to_base_schema_only_extension():
    """An unextended PluginSchemas slot is a SchemaOnly over the base, never None."""
    plugin = define_plugin(PluginSchemas(), meta=_meta())
    entry = plugin.schemas.Opportunity
    assert isinstance(entry, SchemaOnly)
    assert entry.schema_name == "Opportunity"
    assert entry.custom_fields == {}
    # The base schema has no custom fields declared.
    assert entry.common_schema is OpportunityBase


def test_mappings_entry_is_a_transform_extension():
    ext = schema(
        source_schema=PassthroughModel,
        common_schema=OpportunityBase,
        mappings={
            "to_common": {"title": {"field": "opportunity_title"}},
            "from_common": {"opportunity_title": {"field": "title"}},
        },
    )
    plugin = define_plugin(PluginSchemas(Opportunity=ext), meta=_meta())
    assert isinstance(plugin.schemas.Opportunity, SchemaWithTransforms)


def test_define_plugin_rejects_non_extension_in_slot():
    bad = PluginSchemas(Opportunity="not an extension")  # type: ignore[arg-type]
    with pytest.raises(PluginDefinitionError, match="not a schema extension"):
        define_plugin(bad, meta=_meta())


def test_define_plugin_rejects_schema_name_mismatch():
    """A slot holding an extension whose schema_name differs from the attribute name raises."""
    # Hand-build an extension tagged with a different schema name than its slot.
    mismatched = SchemaOnly(
        schema_name="Program",
        common_schema=OpportunityBase,
        custom_fields={},
    )
    bad = PluginSchemas(Opportunity=mismatched)  # type: ignore[arg-type]
    with pytest.raises(
        PluginDefinitionError, match="attribute name must match the schema name"
    ):
        define_plugin(bad, meta=_meta())


# ---------------------------------------------------------------------------
# Plugin container
# ---------------------------------------------------------------------------


def test_plugin_is_frozen():
    plugin = define_plugin(PluginSchemas(), meta=_meta())
    with pytest.raises((AttributeError, TypeError)):
        plugin.meta = _meta()  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Typed route registration (static-typing layer; runtime is additive only)
# ---------------------------------------------------------------------------


def test_define_plugin_threads_registered_routes_onto_plugin():
    """The Routes carrier passed to define_plugin is threaded onto the plugin.

    Regression: if define_plugin dropped ``routes=``, plugin.routes would be the
    default empty carrier and the registered route would be lost.
    """
    registered = Routes(
        opportunities=ResourceRoutes(search=RouteFilters[OppSearchFilters]())
    )
    plugin = define_plugin(
        PluginSchemas(Opportunity=schema(common_schema=OpportunityBase)),
        routes=registered,
        meta=_meta(),
    )
    assert plugin.routes is registered
    assert isinstance(plugin.routes.opportunities, ResourceRoutes)
    assert isinstance(plugin.routes.opportunities.search, RouteFilters)


def test_define_plugin_defaults_routes_to_standard_carrier():
    """Omitting ``routes`` yields a concrete, non-optional standard-filters carrier."""
    plugin = define_plugin(PluginSchemas(), meta=_meta())
    assert isinstance(plugin.routes, Routes)
    assert isinstance(plugin.routes.opportunities, ResourceRoutes)
    assert isinstance(plugin.routes.opportunities.search, RouteFilters)


def test_search_filters_type_is_static_only_returns_dict_at_runtime():
    """search_filters_type is a static-typing projection; at runtime it is ``dict``.

    The narrowing is verified statically by the ``assert_type`` lines in
    examples/typed_filters.py (CI type-checks examples under mypy + pyright).
    """
    plugin = define_plugin(
        PluginSchemas(Opportunity=schema(common_schema=OpportunityBase)),
        routes=Routes(
            opportunities=ResourceRoutes(search=RouteFilters[OppSearchFilters]())
        ),
        meta=_meta(),
    )
    assert plugin.search_filters_type() is dict


def test_route_carriers_are_frozen():
    """The route carriers are frozen so a registration cannot be mutated post-build."""
    routes = Routes(
        opportunities=ResourceRoutes(search=RouteFilters[OppSearchFilters]())
    )
    with pytest.raises((AttributeError, TypeError)):
        routes.opportunities = ResourceRoutes()  # type: ignore[misc]
