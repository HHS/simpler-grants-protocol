#!/usr/bin/env python3
"""Custom filters — the plugin author and consumer experience, end to end.

Three scenarios, each in its own function:

  1. Happy path (mock server): define a plugin with a custom field and a
     registered custom filter, build a client with plugin.get_client(), and search
     with a mix of standard, registered, and ad-hoc filters.
  2. Authoring errors: define_plugin rejects a filter registered with a type that
     is not a filter, and a misspelled resource or method is caught when the route
     carrier is built.
  3. Consumer errors: search rejects a bad filter value before any request is sent
     — the wrong kind of value for a registered filter, and an ad-hoc value that
     does not fit its operator.

Some of these mistakes are also flagged by your IDE (pyright). The lines marked
``# type: ignore`` are the ones the type checker flags; the example suppresses the
type error only so it can also show the runtime guard firing on the same mistake.
examples/typed_custom_filters_failures.py asserts the type errors on their own —
run pyright against that file to see them fire.

Scenario 1 talks to the mock server. Start it first in another terminal:

    poetry run python examples/mock_api_server.py

If it is not running, scenario 1 is skipped and the two offline scenarios still
run:

    poetry run python examples/custom_filters.py

Filter buckets (ADR-0012):
  - Standard filters (status, closeDateRange, ...) become named top-level fields.
  - Registered custom filters (region) go under customFilters, validated against
    the type the plugin declared for them.
  - Ad-hoc filters (any other key) go under customFilters, validated against the
    filter models the SDK knows.
"""

from __future__ import annotations

import json
from typing import Optional

import httpx
from pydantic import Field

from common_grants_sdk.client import Config
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    FilterError,
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

BASE_URL = "http://localhost:8000"


class OppCustomFields(CustomFieldSet):
    """Custom fields the plugin adds to every opportunity it returns."""

    program_code: Optional[CustomField[str]] = Field(
        default=None, description="Funding program code carried from the source system."
    )


class OppSearchFilters(OpportunityFilters, total=False):
    """The custom filters this plugin registers on opportunities.search."""

    region: StringArray


opportunity_plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppCustomFields])),
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),
    meta=PluginMeta(name="grants-gov", source_system="grants.gov"),
)


# ---------------------------------------------------------------------------
# Scenario 1 — happy path (mock server)
# ---------------------------------------------------------------------------


def happy_path() -> None:
    print("=== Scenario 1: happy path (mock server) ===")
    client = opportunity_plugin.get_client(Config(base_url=BASE_URL, api_key="unused"))

    # One flat filter dict mixing all three buckets: "status" is a standard
    # filter, "region" is the registered custom filter, and "fundingType" is an
    # ad-hoc filter the plugin did not register.
    filters: OppSearchFilters = {
        "status": f.in_(["open"]),
        "region": f.in_(["US-CA", "US-NY"]),
        "fundingType": f.eq("grant"),
    }

    try:
        result = client.opportunities.search(filters=filters)
    except (APIError, httpx.HTTPError):
        print(
            f"  (skipped: could not reach {BASE_URL}; start it with "
            "`poetry run python examples/mock_api_server.py`)"
        )
        return

    print(f"  items returned: {len(result.items)}")
    print(f"  per-row parse failures: {len(result.errors)}")
    if result.items:
        opp = result.items[0]
        program_code = None
        if opp.custom_fields is not None and opp.custom_fields.program_code is not None:
            program_code = opp.custom_fields.program_code.value
        print(f"  first opportunity: {opp.title}")
        print(f"  first program code: {program_code or '(none)'}")
    # The client reports the filters it classified and sent, so all three buckets
    # are visible: status at the top level, region and fundingType under
    # customFilters.
    print(f"  filters sent to the server: {json.dumps(result.filter_info.filters)}")


# ---------------------------------------------------------------------------
# Scenario 2 — authoring errors (define_plugin / the route carrier)
# ---------------------------------------------------------------------------


def authoring_errors() -> None:
    print("\n=== Scenario 2: authoring errors ===")

    # A filter registered with a type that is not a filter is rejected when the
    # plugin author defines the plugin, rather than later when a consumer builds a
    # client.
    class BadRegionFilters(OpportunityFilters, total=False):
        region: int  # not a filter value model

    try:
        define_plugin(
            PluginSchemas(Opportunity=schema(common_schema=OpportunityBase)),
            routes=PluginRoutes(opportunities=ResourceRoutes(search=BadRegionFilters)),
            meta=PluginMeta(name="grants-gov", source_system="grants.gov"),
        )
        raise AssertionError("expected define_plugin to reject a non-filter type")
    except FilterError as e:
        print(f"  non-filter registration rejected: {e.path} - {e}")

    # A misspelled resource. PluginRoutes has no "opportunites" field, so your IDE
    # flags the line below, and the typed carrier rejects it at runtime too.
    try:
        PluginRoutes(opportunites=ResourceRoutes(search=OppSearchFilters))  # type: ignore
        raise AssertionError("expected a misspelled resource to be rejected")
    except TypeError as e:
        print(f"  misspelled resource rejected: {e}")

    # A misspelled method. ResourceRoutes has no "serach" field — flagged by your
    # IDE, rejected at runtime.
    try:
        ResourceRoutes(serach=OppSearchFilters)  # type: ignore
        raise AssertionError("expected a misspelled method to be rejected")
    except TypeError as e:
        print(f"  misspelled method rejected: {e}")


# ---------------------------------------------------------------------------
# Scenario 3 — consumer errors (search rejects a bad value before any request)
# ---------------------------------------------------------------------------


def consumer_errors() -> None:
    print("\n=== Scenario 3: consumer errors (search, no request sent) ===")
    client = opportunity_plugin.get_client(Config(base_url=BASE_URL, api_key="unused"))

    # A registered filter given the wrong kind of value. "region" is a string
    # array filter, so f.eq (a scalar comparison) is flagged by your IDE; the
    # runtime guard rejects it before any request too.
    try:
        client.opportunities.search(filters={"region": f.eq("US-CA")})  # type: ignore
        raise AssertionError("expected a FilterError for a wrong region value")
    except FilterError as e:
        print(f"  registered filter, wrong kind of value: {e.path} - {e}")

    # An ad-hoc filter whose value does not fit its operator. "in" expects a list,
    # so the plain string is flagged by your IDE and rejected at runtime.
    try:
        client.opportunities.search(
            filters={"fundingType": {"operator": "in", "value": "grant"}}  # type: ignore
        )
        raise AssertionError("expected a FilterError for an ad-hoc value mismatch")
    except FilterError as e:
        print(f"  ad-hoc filter, value does not fit operator: {e.path} - {e}")


def main() -> None:
    happy_path()
    authoring_errors()
    consumer_errors()
    print("\n✓ custom filters example complete")


if __name__ == "__main__":
    main()
