#!/usr/bin/env python3
"""End-to-end consumer: search opportunities WITH custom filters, via a client.

The full downstream flow an adopter writes against the SDK:

  AUTHOR  registers the custom filters a route accepts — both the typed
          declaration (``OppSearchFilters(OpportunityFilters, total=False)``, the
          static authoring DX) and the runtime ``PluginRoutes`` dict of
          ``CustomFilterSpec`` that ``classify_filters`` consumes.
  CLIENT  ``client.opportunities.search(search=..., filters={...})`` runs
          ``classify_filters`` to build the three-bucket ``OppFilters`` request
          body (default named fields + ``customFilters`` record), sends it, and
          returns typed ``OpportunityBase`` rows.
  CONSUMER builds a filter dict with the ``f.*`` builders, calls search, and
          iterates the typed results.

The ``f.*`` builders are overloaded to return the precise filter model per value
type (``f.in_([...])`` -> ``StringArrayFilter``, ``f.gte(3)`` ->
``NumberComparisonFilter``), so a dict built with ``f.*`` composes directly with
the typed ``OppSearchFilters`` bag the route registered — the consumer call below
type-checks with NO call-site annotations and each key narrows to its value model
(the ``assert_type`` lines prove it).

Transport is STUBBED here, per ADR-0022: the SDK client is a typed slot, and the
real transport (networking, auth, retry) is a downstream-deployment concern, out
of scope for this repo. The stub runs the real ``classify_filters`` engine and
prints the exact request body it WOULD send, then returns canned, validated rows.

The ``filters=`` signature shown here lives on the local stub, not on the
production SDK client; this example does not modify the production client.

Run (from lib/python-sdk/):
    poetry run python examples/consumer_search_with_filters.py
"""

from __future__ import annotations

import json
from typing import Any, Mapping, Optional, cast

from typing_extensions import assert_type

from common_grants_sdk.extensions import classify_filters, f
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import PluginRoutes
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    NumberComparison,
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase
from common_grants_sdk.schemas.pydantic.models.opp_status import OppStatusOptions

# ---------------------------------------------------------------------------
# Author: register the opportunities-search custom filters
# ---------------------------------------------------------------------------
# Typed declaration (static authoring DX): a consumer who imports this gets
# per-key narrowing on the registered filters. See examples/typed_filters.py.


class OppSearchFilters(OpportunityFilters, total=False):
    """The opportunities-search filters this plugin accepts: standard + custom.

    The typed authoring surface for the route. Because the ``f.*`` builders return
    the precise per-key models, a consumer writes the filter dict with ``f.*`` and
    it type-checks directly against this bag — no annotation, full per-key
    narrowing (see the ``assert_type`` lines in ``demo``).
    """

    agency: StringArray
    awardCount: NumberComparison


# Runtime registration the classifier consumes (mirrors examples/custom_filters.py).
# Each custom filter's value shape is enforced at call time by its filter_type model.
ROUTES: PluginRoutes = {
    "opportunities": {
        "search": {
            "filters": {
                "agency": CustomFilterSpec(filter_type=CustomFilterType.STRING_ARRAY),
                "awardCount": CustomFilterSpec(
                    filter_type=CustomFilterType.NUMBER_COMPARISON,
                    description="Number of awards expected",
                ),
            }
        }
    },
}

# Canned rows the stub returns — camelCase wire keys, as the real client hydrates
# from the API JSON (model_validate_json in client/opportunities.py).
_CANNED_ROWS = [
    {
        "id": "049b4f15-3d2a-4b8e-9a1c-2f7e6d5c4b3a",
        "title": "Conservation Research Grant",
        "status": {"value": "open"},
        "description": "Funding for habitat conservation research.",
        "createdAt": "2026-01-15T09:00:00Z",
        "lastModifiedAt": "2026-02-01T12:30:00Z",
    },
    {
        "id": "7c1e2b9d-8a6f-4c3e-b5d7-1a9f8e6d4c2b",
        "title": "STEM Education Initiative",
        "status": {"value": "open"},
        "description": "Support for K-12 STEM program development.",
        "createdAt": "2026-01-20T10:15:00Z",
        "lastModifiedAt": "2026-02-03T08:45:00Z",
    },
]


# ---------------------------------------------------------------------------
# Stubbed opportunities client (transport out-of-scope, ADR-0022)
# ---------------------------------------------------------------------------
class StubOpportunities:
    """A stubbed opportunities namespace that accepts the typed filter bag.

    Mirrors the production ``Opportunities`` namespace, but its ``search`` adds a
    ``filters=`` parameter typed to the registered ``OppSearchFilters`` bag, and
    stubs the transport: it runs the real ``classify_filters`` engine, prints the
    request body it would POST, and returns canned, validated rows instead of
    making a network call.
    """

    def search(
        self,
        *,
        search: str,
        filters: OppSearchFilters,
        status: Optional[list[OppStatusOptions]] = None,
        page: int = 1,
        page_size: int = 10,
        schema: type[OpportunityBase] = OpportunityBase,
    ) -> list[OpportunityBase]:
        """Search opportunities with default + custom filters.

        ``filters`` is the typed ``OppSearchFilters`` bag — the consumer gets
        per-key autocomplete and value-type checking at the call site. The body is
        built via ``classify_filters`` (default named fields route to the top
        level; registered + ad-hoc custom filters land in ``customFilters``), then
        typed rows are returned. Raises ``FilterError`` if a registered filter is
        called with an operator its type does not allow.

        The cast bridges the typed TypedDict bag to the runtime classifier's
        ``Mapping`` parameter (a TypedDict's values widen to ``object``); this
        boundary cast belongs in the client facade, not the consumer call site.
        """
        request_body = classify_filters(
            ROUTES,
            "opportunities",
            "search",
            cast("Mapping[str, Any]", filters),
        )
        wire = request_body.model_dump(by_alias=True, exclude_none=True, mode="json")
        print(
            f"  POST {self.path} (page={page}, pageSize={page_size}, search={search!r})"
        )
        print("  request body filters:")
        print("    " + json.dumps(wire, indent=2).replace("\n", "\n    "))
        return [schema.model_validate(row) for row in _CANNED_ROWS]

    @property
    def path(self) -> str:
        """The opportunities search path the real client posts to."""
        return "/common-grants/opportunities/search"


class StubClient:
    """A stub client exposing the ``opportunities`` namespace (transport-free)."""

    def __init__(self) -> None:
        self.opportunities = StubOpportunities()


# ---------------------------------------------------------------------------
# Consumer: build filters, search, iterate the typed results
# ---------------------------------------------------------------------------
def demo() -> None:
    print("Consumer: search opportunities with custom filters (stubbed transport)\n")

    client = StubClient()

    # A filter dict built with the f.* helpers. The builders return the precise
    # per-key models, so each value narrows to exactly the type OppSearchFilters
    # declares — the call below type-checks with NO annotation. These assert_type
    # lines are the composition contract.
    assert_type(f.in_(["open", "forecasted"]), StringArray)  # status / agency value
    assert_type(f.gte(3), NumberComparison)  # awardCount value

    # The dict composes directly against the registered bag at the call site, with
    # no annotation: f.in_ -> StringArrayFilter matches status/agency, f.gte ->
    # NumberComparisonFilter matches awardCount.
    results = client.opportunities.search(
        search="conservation",
        filters={
            "status": f.in_(["open", "forecasted"]),  # default -> top level
            "agency": f.in_(["NSF", "NIH"]),  # registered custom -> customFilters
            "awardCount": f.gte(3),  # registered custom -> customFilters
        },
    )

    print(f"\n  -> {len(results)} opportunities returned (typed OpportunityBase):")
    for opp in results:
        # opp is a typed OpportunityBase: dot access on concrete fields.
        print(f"     - {opp.title} [{opp.status.value}] ({opp.id})")


if __name__ == "__main__":
    demo()
