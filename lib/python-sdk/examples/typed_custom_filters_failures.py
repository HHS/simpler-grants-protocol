"""Negative type fixtures — these SHOULD fail pyright.

This file is excluded from the main type gate (``pyrightconfig.json``) so its
intentional errors do not fail ``make check-types``; it exists to prove the type
guards fire. It has its own config, ``pyrightconfig.fixtures.json``, and::

    cd lib/python-sdk && make check-fixtures

verifies that pyright reports exactly one error per ``# EXPECT-ERROR`` marker
below — a route typo and a wrong filter value.
"""

from __future__ import annotations

from typing import Optional

from pydantic import Field

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


class OppCustomFields(CustomFieldSet):
    program_code: Optional[CustomField[str]] = Field(default=None)


class OppSearchFilters(OpportunityFilters, total=False):
    region: StringArray


# 1. Route typo: PluginRoutes has no "opportunites" slot (only "opportunities").
bad_routes = PluginRoutes(
    opportunites=ResourceRoutes(search=OppSearchFilters)  # EXPECT-ERROR: no such field
)

plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppCustomFields])),
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),
    meta=PluginMeta(name="grants-gov adapter", source_system="grants.gov"),
)
client = plugin.get_client()

# 2. Wrong filter value: "region" is a StringArray filter (needs f.in_([...])); an
#    f.eq(...) is a StringComparison and is rejected at the call site.
client.opportunities.search(
    filters={"region": f.eq("US-CA")}  # EXPECT-ERROR: region is a StringArray filter
)
