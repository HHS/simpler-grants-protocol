"""Negative type fixtures — these SHOULD fail pyright.

This file is excluded from the main type gate (``pyrightconfig.json``) so its
intentional errors do not fail ``make check-types``; it exists to prove the type
guards fire. It has its own config, ``pyrightconfig.fixtures.json``, and::

    cd lib/python-sdk && make check-fixtures

verifies that pyright reports exactly one error per marked line below, no more:
route typos and wrong filter values.
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
from common_grants_sdk.schemas.pydantic.filters import AwardFilters
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


class OppCustomFields(CustomFieldSet):
    program_code: Optional[CustomField[str]] = Field(default=None)


class OppSearchFilters(OpportunityFilters, total=False):
    region: StringArray


class AwardSearchFilters(AwardFilters, total=False):
    program_code: StringArray


# 1. Route typo: PluginRoutes has no "opportunites" slot (only "opportunities").
bad_routes = PluginRoutes(
    opportunites=ResourceRoutes(search=OppSearchFilters)  # EXPECT-ERROR: no such field
)
bad_award_routes = PluginRoutes(
    award=ResourceRoutes(search=AwardSearchFilters)  # EXPECT-ERROR: slot is "awards"
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

award_client = define_plugin(
    PluginSchemas(),
    routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
    meta=PluginMeta(name="awards adapter", source_system="grants.gov"),
).get_client()

# 3. Wrong registered award value: "program_code" is a StringArray filter.
award_client.awards.search(
    filters={"program_code": f.eq("RESEARCH")}  # EXPECT-ERROR: StringArray filter
)

# 4. Wrong standard award value: "opportunity_id" is a StringArray filter too.
award_client.awards.search(
    filters={"opportunity_id": f.eq("x")}  # EXPECT-ERROR: StringArray filter
)
