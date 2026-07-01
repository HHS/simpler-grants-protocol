"""Negative type fixtures — these SHOULD fail pyright.

Reviewers validate the unhappy path (the guards the happy-path example relies on)
by running pyright against this file directly::

    cd lib/python-sdk && poetry run pyright examples/typed_custom_filters_failures.py

Expected: pyright reports errors on the lines marked ``# EXPECT-ERROR`` — a route
typo and a wrong filter value. This file is excluded from the type gate so its
intentional errors do not fail CI; it exists to prove the type guards fire.
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
