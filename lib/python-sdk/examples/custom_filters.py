#!/usr/bin/env python3
"""Custom filters example — codegen-free request-body demo.

Demonstrates typed route registration, flat call-site classification, and the
three-bucket ``OppFilters`` request body (default named fields + customFilters
record) using the grants.gov canonical example from #646/#869.

No code generation (custom filters are a pure-runtime classifier). Routes are a
typed ``PluginRoutes`` carrier — the author extends ``OpportunityFilters`` with
one typed key per custom filter, so ``classify_filters`` recovers each key's
value model from the TypedDict.

Run (from lib/python-sdk/):
    poetry run python examples/custom_filters.py
"""

from __future__ import annotations

import json

from common_grants_sdk.extensions import (
    PluginRoutes,
    ResourceRoutes,
    classify_filters,
    f,
)
from common_grants_sdk.extensions.types import PluginMeta
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
    StringComparison,
)

# ---------------------------------------------------------------------------
# Typed route registration + plugin metadata
# ---------------------------------------------------------------------------

meta = PluginMeta(
    name="grants-gov",
    version="0.1.0",
    source_system="grants.gov",
    capabilities=["customFilters"],
)


class OppSearchFilters(OpportunityFilters, total=False):
    """The custom filters this plugin accepts on opportunities.search.

    Each key's annotation *is* its Pydantic value model, so the call-site value
    validates against it and the classifier recovers it from the TypedDict.
    """

    agency: StringArray
    fundingProgram: StringComparison


routes: PluginRoutes = PluginRoutes(
    opportunities=ResourceRoutes(search=OppSearchFilters)
)


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)


def main() -> None:
    # --- Declared routes ---
    _section("PLUGIN ROUTES (declared)")
    print("  opportunities.search custom filters:")
    print("    agency: StringArray")
    print("    fundingProgram: StringComparison — Program name filter")

    # --- Classify: default + registered custom + ad-hoc ---
    _section("CLASSIFY FILTERS — default + custom + ad-hoc (canonical grants.gov demo)")

    # Mixing three kinds of filters in a single flat dict:
    #   "status"            — default core filter (snake_case key, no alias)
    #   "close_date_range"  — default core filter, snake_case key for an ALIASED field:
    #                         the classifier must normalize it to "closeDateRange"
    #                         (an unnormalized snake key is silently dropped —
    #                         the alias landmine)
    #   "agency"         — registered custom filter (opportunities.search.agency)
    #   "fundingProgram" — registered custom filter (opportunities.search.fundingProgram)
    #   "legacyTag"      — ad-hoc passthrough (not registered, not a core default)
    consumer_filters = {
        "status": f.in_(["open", "forecasted"]),
        "close_date_range": f.between("2026-01-01", "2026-12-31"),
        "agency": f.in_(["NSF", "NIH"]),
        "fundingProgram": f.eq("research-grants"),
        "legacyTag": f.eq("priority"),
    }

    classified = classify_filters(routes, "opportunities", "search", consumer_filters)

    print("\nRequest body (by_alias=True, exclude_none=True, mode='json'):")
    print(
        json.dumps(
            classified.result.model_dump(by_alias=True, exclude_none=True, mode="json"),
            indent=2,
        )
    )

    # --- FilterError demo — bad call is fail-soft (collected, not raised) ---
    _section("VALIDATION — bad operator collected, valid filters still applied")

    # agency is registered as StringArray (expects ArrayOperator: in/notIn).
    # Passing f.eq(...) (EquivalenceOperator.EQUAL) fails call-time validation.
    # Fail-soft: classify_filters never raises on a bad
    # filter value — the bad key is dropped from the result body and a FilterError
    # is collected on .errors. A valid sibling filter still classifies normally.
    bad_filters = {
        "agency": f.eq(
            "wrong-operator-for-array-type"
        ),  # eq is not a valid StringArray op
        "legacyTag": f.eq("priority"),  # valid ad-hoc filter — survives
    }
    classified_bad = classify_filters(routes, "opportunities", "search", bad_filters)
    for err in classified_bad.errors:
        # str(err) summarizes the first failure; the structured fields carry
        # the full detail — err.path names the failing filter, err.cause is
        # the underlying pydantic ValidationError for programmatic access.
        print(f"FilterError collected: {err}")
        print(f"  path:  {err.path}")
        print(f"  cause: {type(err.cause).__name__}")
    # The valid filter still made it into the request body.
    print(
        "\nValid-only request body: "
        + json.dumps(
            classified_bad.result.model_dump(
                by_alias=True, exclude_none=True, mode="json"
            )
        )
    )

    # --- Plugin metadata ---
    _section("PLUGIN METADATA")
    print(f"name:         {meta.name}")
    print(f"version:      {meta.version}")
    print(f"sourceSystem: {meta.source_system}")
    print(f"capabilities: {meta.capabilities}")


if __name__ == "__main__":
    main()
