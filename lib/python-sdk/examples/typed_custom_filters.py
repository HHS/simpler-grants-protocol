"""Typed custom filters — the plugin-author and plugin-consumer experience.

Shows the whole surface end to end: an author declares custom fields and a custom
filter once, assembles a plugin, and a consumer gets a fully-typed client from
``plugin.get_client()`` — registered filters type the ``search(filters=...)`` call
site, and responses parse with the custom fields by default.

The ``_typecheck`` function below is never executed; it exists so pyright verifies
the consumer's typing (``assert_type``). The unhappy path has two halves:
- static (a route typo, a wrong filter value) lives in
  ``typed_custom_filters_failures.py`` — run pyright against it.
- runtime (an invalid value on a standard/registered filter raises before any
  request) is ``demo_invalid_filter_raises`` below — runnable without an API::

      poetry run python -c "import examples.typed_custom_filters as e; e.demo_invalid_filter_raises()"

Run live against an API: ``poetry run python examples/typed_custom_filters.py``.
"""

from __future__ import annotations

from typing import Optional, cast

from pydantic import Field
from typing_extensions import assert_type

from common_grants_sdk.client import Client, Config, SearchResult
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


# 1. CUSTOM FIELDS — declared once as a typed model. Each field's value type flows
#    through to ``opp.custom_fields.<field>.value`` on every parsed response row.
class OppCustomFields(CustomFieldSet):
    program_code: Optional[CustomField[str]] = Field(
        default=None, description="Program code carried from the source system."
    )
    legacy_id: Optional[CustomField[int]] = Field(
        default=None, description="Legacy integer identifier."
    )


# 2. CUSTOM FILTERS — declared once by subclassing the SDK's filter TypedDict. This
#    same type registers the filter (via the route below) AND types the consumer's
#    ``search(filters=...)`` call site — no second declaration to drift.
class OppSearchFilters(OpportunityFilters, total=False):
    region: StringArray


# 3. ASSEMBLE — bind the custom-field model to the Opportunity schema slot and the
#    custom-filter type to the opportunities/search route. One call, two axes.
opportunity_plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppCustomFields])),
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),
    meta=PluginMeta(name="grants-gov adapter", source_system="grants.gov"),
)


def _typecheck() -> None:
    """Static proof of the consumer typing (checked by pyright, never run)."""
    client = opportunity_plugin.get_client()
    assert_type(client, Client[OppSearchFilters, OpportunityBase[OppCustomFields]])

    # "region" is typed; f.eq(...) here would be a pyright error (see the failures
    # fixture). "status" is a standard filter; an ad-hoc key still passes through.
    result = client.opportunities.search(
        search="ai", filters={"region": f.in_(["US-CA", "US-NY"])}
    )
    assert_type(result, SearchResult[OpportunityBase[OppCustomFields]])
    assert_type(result.items, list[OpportunityBase[OppCustomFields]])

    for opp in result.items:
        fields = opp.custom_fields
        assert_type(fields, Optional[OppCustomFields])
        if fields is not None and fields.program_code is not None:
            assert_type(
                fields.program_code.value, str
            )  # typed str from CustomField[str]


def demo_invalid_filter_raises() -> None:
    """Runtime unhappy-path check: an invalid registered-filter value raises.

    Needs no API — the client validates and raises before any request goes out.
    ``region`` is a StringArray filter, so a scalar ``between`` value is invalid.
    """
    from common_grants_sdk.extensions import FilterError

    # Dummy config is never used to connect — the guard raises before any request.
    client = opportunity_plugin.get_client(
        Config(base_url="https://example.invalid", api_key="unused")
    )
    # cast: a real consumer's dynamic/untyped filter dict bypasses the static
    # check; the runtime guard is the backstop that still catches the bad value.
    bad_filters = cast(
        OppSearchFilters, {"region": {"operator": "between", "value": 5}}
    )
    try:
        client.opportunities.search(filters=bad_filters)
    except FilterError as exc:
        print("raised as expected:", exc.path, "-", exc)
        return
    raise AssertionError("expected FilterError on an invalid registered filter value")


def main() -> None:
    """Run a live search against a configured API."""
    client = opportunity_plugin.get_client(Config())
    result = client.opportunities.search(
        search="ai", filters={"region": f.in_(["US-CA", "US-NY"])}
    )
    for opp in result.items:
        print(opp.id, opp.custom_fields)
    for err in result.errors:
        print("parse error at row", err.index, "-", err.message)


if __name__ == "__main__":
    main()
