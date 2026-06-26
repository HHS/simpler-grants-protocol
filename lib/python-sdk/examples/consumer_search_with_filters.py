#!/usr/bin/env python3
"""End-to-end consumer: search opportunities WITH custom filters, via the SDK client.

The full downstream flow an adopter writes against the SDK:

  AUTHOR   registers the custom filters a route accepts on the plugin
           (``define_plugin(routes=...)`` → ``plugin.routes``, a ``PluginRoutes`` map
           of ``CustomFilterSpec``), and extends the ``OpportunityFilters`` TypedDict
           so the call-site filter dict narrows per key.
  CONSUMER constructs the client with the registered routes
           (``Client(config, routes=plugin.routes)``), builds a filter dict with the
           ``f.*`` builders, and calls ``client.opportunities.search(search=..., filters=...)``.
           The client runs ``classify_filters`` to build the three-bucket request body
           (default named fields + ``customFilters`` record), POSTs it, and returns
           typed ``OpportunityBase`` rows.

The ``f.*`` builders return the precise filter model per value type
(``f.in_([...])`` -> ``StringArrayFilter``, ``f.gte(3)`` -> ``NumberComparisonFilter``),
so a dict built with ``f.*`` composes directly with the typed ``OppSearchFilters`` bag
the route registered — each key narrows to its value model (the ``assert_type`` lines
prove it).

Run against a CommonGrants endpoint on http://localhost:8000 (see examples/README.md).
The Pennsylvania reference API (``examples/pa-opportunity-example``) accepts the
``customFilters`` body and echoes it back in ``filterInfo`` (it narrows results on the
standard ``status`` filter; how a deployment applies custom filters is its own concern):

    poetry run python examples/consumer_search_with_filters.py
"""

from __future__ import annotations

from typing_extensions import assert_type

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.extensions import (
    CustomFilterSpec,
    CustomFilterType,
    PluginMeta,
    PluginSchemas,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    NumberComparison,
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase

# ---------------------------------------------------------------------------
# Author: register the opportunities-search custom filters on the plugin
# ---------------------------------------------------------------------------
# Typed authoring surface: extend OpportunityFilters so the call-site filter dict
# narrows per key (agency -> StringArray, awardCount -> NumberComparison).


class OppSearchFilters(OpportunityFilters, total=False):
    """The opportunities-search filters this plugin accepts: standard + custom."""

    agency: StringArray
    awardCount: NumberComparison


# Route registration the client's classifier consumes (see define_plugin(routes=...)).
# Each custom filter's value shape is enforced at call time by its filter_type model.
plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase)),
    routes={
        "opportunities": {
            "search": {
                "filters": {
                    "agency": CustomFilterSpec(
                        filter_type=CustomFilterType.STRING_ARRAY
                    ),
                    "awardCount": CustomFilterSpec(
                        filter_type=CustomFilterType.NUMBER_COMPARISON,
                        description="Number of awards expected",
                    ),
                }
            }
        }
    },
    meta=PluginMeta(name="grants.gov", source_system="grants.gov"),
)


# ---------------------------------------------------------------------------
# Consumer: build filters, search, iterate the typed results
# ---------------------------------------------------------------------------
def demo() -> None:
    print("Consumer: search opportunities with custom filters\n")

    config = Config(
        base_url="http://localhost:8000", api_key="two_orgs_user_key", timeout=5.0
    )
    # Routes are bound to the client once at construction (not per search call).
    client = Client(config, routes=plugin.routes)

    # A filter dict built with the f.* helpers. The builders return the precise
    # per-key models, so each value narrows to exactly the type OppSearchFilters
    # declares. These assert_type lines are the composition contract.
    assert_type(f.in_(["open", "forecasted"]), StringArray)  # status / agency value
    assert_type(f.gte(3), NumberComparison)  # awardCount value

    filters: OppSearchFilters = {
        "status": f.in_(["open", "forecasted"]),  # default -> top level
        "agency": f.in_(["NSF", "NIH"]),  # registered custom -> customFilters
        "awardCount": f.gte(3),  # registered custom -> customFilters
    }

    response = client.opportunities.search(
        search="conservation",
        filters=filters,
    )

    print(f"  -> {len(response.items)} opportunities returned (typed OpportunityBase):")
    for opp in response.items:
        # opp is a typed OpportunityBase: dot access on concrete fields.
        print(f"     - {opp.title} [{opp.status.value}] ({opp.id})")


if __name__ == "__main__":
    demo()
