#!/usr/bin/env python3
"""Custom filters example — codegen-free ADR-0012 request-body demo.

Demonstrates route-keyed custom filter declaration, flat call-site classification,
and the three-bucket ADR-0012 request body (default named fields + customFilters record)
using the grants.gov canonical example from #646/#869.

No code generation (custom filters are a pure-runtime classifier).  The example
imports directly from ``common_grants_sdk.extensions`` — no codegen schemas needed.

Run (from lib/python-sdk/):
    poetry run python examples/custom_filters.py
"""

from __future__ import annotations

import json

from common_grants_sdk.extensions import classify_filters, define_plugin, f
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import PluginError, PluginExtensionsMeta

# ---------------------------------------------------------------------------
# Plugin declaration — route-keyed custom filter specs
# ---------------------------------------------------------------------------

grants_gov = define_plugin(
    meta=PluginExtensionsMeta(
        name="grants-gov",
        version="0.1.0",
        sourceSystem="grants.gov",
        capabilities=["customFilters"],
    ),
    routes={
        "opportunities": {
            "search": {
                "agency": CustomFilterSpec(filter_type=CustomFilterType.STRING_ARRAY),
                "fundingProgram": CustomFilterSpec(
                    filter_type=CustomFilterType.STRING_COMPARISON,
                    description="Program name filter",
                ),
            }
        }
    },
)


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)


def main() -> None:
    # --- Declared routes ---
    _section("PLUGIN ROUTES (declared)")
    if grants_gov.routes:
        for resource, methods in grants_gov.routes.items():
            for method, filters in methods.items():
                print(f"  {resource}.{method}:")
                for name, spec in filters.items():
                    desc = f" — {spec.description}" if spec.description else ""
                    print(f"    {name}: {spec.filter_type.value}{desc}")

    # --- Classify: default + registered custom + ad-hoc ---
    _section("CLASSIFY FILTERS — default + custom + ad-hoc (canonical grants.gov demo)")

    # Mixing three kinds of filters in a single flat dict:
    #   "status"            — default core filter (snake_case key, no alias)
    #   "close_date_range"  — default core filter, snake_case key for an ALIASED field:
    #                         the classifier must normalize it to "closeDateRange" in the
    #                         wire body (an unnormalized snake key would silently land in
    #                         customFilters — the alias landmine)
    #   "agency"         — registered custom filter (routes.opportunities.search.agency)
    #   "fundingProgram" — registered custom filter (routes.opportunities.search.fundingProgram)
    #   "legacyTag"      — ad-hoc passthrough (not registered, not a core default)
    consumer_filters = {
        "status": f.in_(["open", "forecasted"]),
        "close_date_range": f.between("2026-01-01", "2026-12-31"),
        "agency": f.in_(["NSF", "NIH"]),
        "fundingProgram": f.eq("research-grants"),
        "legacyTag": f.eq("priority"),
    }

    assert grants_gov.routes is not None
    request_body = classify_filters(
        grants_gov.routes, "opportunities", "search", consumer_filters
    )

    print("\nRequest body (ADR-0012, by_alias=True, exclude_none=True, mode='json'):")
    print(
        json.dumps(
            request_body.model_dump(by_alias=True, exclude_none=True, mode="json"),
            indent=2,
        )
    )

    # --- PluginError demo — bad call raises and is caught ---
    _section("VALIDATION — bad operator raises PluginError (runtime guarantee)")

    # agency is registered as STRING_ARRAY (expects ArrayOperator: in/notIn).
    # Passing f.eq(...) (EquivalenceOperator.EQUAL) triggers call-time validation failure.
    bad_filters = {
        "agency": f.eq(
            "wrong-operator-for-array-type"
        ),  # eq is not a valid STRING_ARRAY op
    }
    try:
        classify_filters(grants_gov.routes, "opportunities", "search", bad_filters)
    except PluginError as exc:
        print(f"PluginError caught: {exc}")

    # --- Plugin metadata ---
    _section("PLUGIN METADATA")
    if grants_gov.meta:
        print(f"name:         {grants_gov.meta.name}")
        print(f"version:      {grants_gov.meta.version}")
        print(f"sourceSystem: {grants_gov.meta.source_system}")
        print(f"capabilities: {grants_gov.meta.capabilities}")


if __name__ == "__main__":
    main()
