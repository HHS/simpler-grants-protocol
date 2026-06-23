#!/usr/bin/env python3
"""Typed custom-filter authoring DX — the static-typing layer over the runtime classifier.

AUTHOR: extend the opportunities standard-filters TypedDict (``OpportunityFilters``)
with custom filters, then register it on the route via ``Routes`` / ``ResourceRoutes`` /
``RouteFilters`` passed to ``define_plugin(routes=...)``.

CONSUMER: recover the registered filter type from the plugin via
``plugin.search_filters_type()`` — no call-site annotations — and get per-key value
narrowing on every registered key (standard + custom), proven by the ``assert_type``
lines below.

This is the static-typing layer only. The runtime classifier (``classify_filters`` /
``validate_routes`` / ``FilterError``) is unchanged; see ``custom_filters.py`` for the
runtime classification demo. ``search_filters_type`` returns the typed filter slot,
not a client.

Run (from lib/python-sdk/):
    poetry run python examples/typed_filters.py
"""

from __future__ import annotations

from typing import Optional, get_type_hints

from typing_extensions import assert_type

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginSchemas,
    ResourceRoutes,
    RouteFilters,
    Routes,
    define_plugin,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters import (
    DateRangeFilter,
    MoneyRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.base import (
    ArrayOperator,
    ComparisonOperator,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    NumberComparison,
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase
from pydantic import Field

# ---------------------------------------------------------------------------
# Author: register custom filters on the opportunities search route
# ---------------------------------------------------------------------------
# Extend the standard ``OpportunityFilters`` with custom filters, then name the
# extended bag in ``routes`` so ``agency`` and ``awardCount`` autocomplete (and
# are value-typed) on the registered search-filters slot.


class OppFields(CustomFieldSet):
    """grants.gov custom fields carried on the Opportunity schema."""

    agency_name: Optional[CustomField[str]] = Field(
        default=None, description="Agency hosting the opportunity"
    )


class OppSearchFilters(OpportunityFilters, total=False):
    """The opportunities-search filters this plugin accepts: standard + custom."""

    agency: StringArray
    awardCount: NumberComparison


routes_plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppFields])),
    routes=Routes(
        opportunities=ResourceRoutes(search=RouteFilters[OppSearchFilters]())
    ),
    meta=PluginMeta(name="grants.gov", source_system="grants.gov"),
)


# ---------------------------------------------------------------------------
# Consumer: recover the registered filter type and get per-key narrowing
# ---------------------------------------------------------------------------
def demo() -> None:
    print("Typed custom-filter authoring DX")

    # No call-site type arguments: the registered TypedDict is recovered from the
    # plugin's route registration via the constrained-``self`` projection. This is
    # the narrowing contract — it narrows identically under mypy and pyright.
    filters_type = routes_plugin.search_filters_type()
    assert_type(filters_type, "type[OppSearchFilters]")

    # Build a value of the registered type. Each key is typed to its value model,
    # so the wrong model on a key is a static error (proven negatively by the
    # commented line below — uncomment to see both checkers reject it).
    filters: OppSearchFilters = {
        "status": StringArray(operator=ArrayOperator.IN, value=["open", "forecasted"]),
        "agency": StringArray(operator=ArrayOperator.IN, value=["NSF", "NIH"]),
        "awardCount": NumberComparison(
            operator=ComparisonOperator.GREATER_THAN_OR_EQUAL, value=3
        ),
    }
    # filters["awardCount"] = StringArray(operator=ArrayOperator.IN, value=["x"])  # type error

    # Per-key narrowing on the registered TypedDict (standard + custom keys).
    # ``.get(key)`` yields ``ValueType | None`` on a ``total=False`` TypedDict;
    # ``assert_type`` pins each key to its registered value type with NO call-site
    # annotations. These lines ARE the narrowing contract.
    assert_type(filters.get("status"), "StringArray | None")  # standard key
    assert_type(filters.get("agency"), "StringArray | None")  # custom key
    assert_type(filters.get("awardCount"), "NumberComparison | None")  # custom key

    # The standard keys inherited from ``OpportunityFilters`` keep their value types
    # even on the bare base bag.
    standard: OpportunityFilters = {}
    assert_type(standard.get("status"), "StringArray | None")
    assert_type(standard.get("closeDateRange"), "DateRangeFilter | None")
    assert_type(standard.get("minAwardAmountRange"), "MoneyRangeFilter | None")

    # The registered keys are visible at runtime via the TypedDict's annotations.
    keys = set(get_type_hints(OppSearchFilters))
    registered_ok = {"status", "agency", "awardCount"} <= keys
    print(
        f"  [{'PASS' if registered_ok else 'FAIL'}] "
        f"registered keys present: {sorted(keys)}"
    )

    # Runtime: the constructed filters validate through the underlying models.
    status = filters.get("status")
    agency = filters.get("agency")
    award = filters.get("awardCount")
    runtime_ok = (
        isinstance(status, StringArray)
        and status.value == ["open", "forecasted"]
        and isinstance(agency, StringArray)
        and agency.value == ["NSF", "NIH"]
        and isinstance(award, NumberComparison)
        and award.value == 3
    )
    print(
        f"  [{'PASS' if runtime_ok else 'FAIL'}] "
        "values validate through the registered models"
    )

    # Reference the range-filter imports so the narrowing assertions above are exercised.
    _ = (DateRangeFilter, MoneyRangeFilter)


if __name__ == "__main__":
    demo()
