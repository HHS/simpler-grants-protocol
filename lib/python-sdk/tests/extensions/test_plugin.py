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
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
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
# Route registration (PluginRoutes threaded onto the plugin)
# ---------------------------------------------------------------------------


class OppSearchFilters(OpportunityFilters, total=False):
    """A route filter TypedDict registering one custom filter (agency)."""

    agency: StringArray


def test_define_plugin_threads_routes_onto_plugin():
    """The PluginRoutes carrier passed to define_plugin is threaded onto the plugin.

    Regression: if define_plugin dropped ``routes=``, plugin.routes would default
    to the empty carrier and the registered custom filters would be lost.
    """
    registered: PluginRoutes = PluginRoutes(
        opportunities=ResourceRoutes(search=OppSearchFilters)
    )
    plugin = define_plugin(
        PluginSchemas(Opportunity=schema(common_schema=OpportunityBase)),
        routes=registered,
        meta=_meta(),
    )
    assert plugin.routes is registered
    assert plugin.routes.opportunities.search is OppSearchFilters


def test_define_plugin_defaults_routes_to_empty_carrier():
    """Omitting ``routes`` yields a concrete, non-optional empty carrier (never None)."""
    plugin = define_plugin(PluginSchemas(), meta=_meta())
    assert isinstance(plugin.routes, PluginRoutes)
    # The empty carrier registers no custom filters.
    assert plugin.routes.opportunities.search is None
