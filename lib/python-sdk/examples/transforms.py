#!/usr/bin/env python3
"""Bidirectional transform PoC — plugin transformation interface.

Demonstrates source (grants.gov) → CommonGrants and CommonGrants → source
bidirectional transformations using the grants.gov sample plugin.

Requires generated schemas (examples/plugins/grants_gov/generated/).
Generate them first (from lib/python-sdk/):
    poetry run python -m common_grants_sdk.extensions.generate --plugin examples/plugins/grants_gov
Or run all plugins at once:
    make plugins

Then run (from lib/python-sdk/):
    poetry run python examples/transforms.py
"""

from __future__ import annotations

import json
from typing import Any

# When run as `poetry run python examples/transforms.py`, Python automatically
# adds the script's directory (examples/) to sys.path. Import from there using
# the `plugins.` prefix (not `examples.plugins.`) — the `examples.` prefix only
# works in -c or interactive contexts where lib/python-sdk/ is sys.path[0].
from plugins.grants_gov import grants_gov as plugin
from plugins.grants_gov.generated.schemas import Opportunity

from common_grants_sdk.extensions import build_transforms
from common_grants_sdk.utils.transformation import get_from_path

# ---------------------------------------------------------------------------
# Sample grants.gov source data
# ---------------------------------------------------------------------------

SOURCE_DATA: dict[str, Any] = {
    "data": {
        "agency_name": "Department of Examples",
        "created_at": "2025-01-15T09:00:00Z",
        "last_modified_at": "2025-04-01T12:30:00Z",
        "opportunity_description": "Funding to advance research into conservation techniques for endangered ecosystems.",
        "opportunity_id": 12345,
        "opportunity_number": "ABC-123-XYZ-001",
        "opportunity_status": "posted",
        "opportunity_title": "Research into conservation techniques",
        "opportunity_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "priority_score_str": "75",
        "summary": {
            "applicant_types": ["state_governments"],
            "archive_date": "2025-05-01",
            "award_ceiling": 100000,
            "award_floor": 10000,
            "forecasted_award_date": "2025-09-01",
            "forecasted_close_date": "2025-07-15",
            "forecasted_post_date": "2025-05-01",
        },
    }
}


# ---------------------------------------------------------------------------
# Custom handlers: join_fields and split_field
#
# join_fields concatenates multiple source field values with a configurable
# separator. Mapping spec: {"join": {"fields": ["a.b", "c.d"], "sep": " — "}}
#
# split_field is the inverse: it splits a single field on a separator and
# returns the element at the given index.
# Mapping spec: {"split": {"field": "label", "sep": " — ", "index": 0}}
# ---------------------------------------------------------------------------


def join_fields(data: dict[str, Any], spec: dict[str, Any]) -> str | None:
    """Custom handler that joins multiple field values with a separator."""
    sep = spec.get("sep", " ")
    parts = [get_from_path(data, path) for path in spec.get("fields", [])]
    values = [str(p) for p in parts if p is not None]
    return sep.join(values) if values else None


def split_field(data: dict[str, Any], spec: dict[str, Any]) -> str | None:
    """Custom handler that splits a field value and returns the element at index."""
    value = get_from_path(data, spec.get("field", ""))
    if value is None:
        return None
    parts = str(value).split(spec.get("sep", " "))
    index = spec.get("index", 0)
    return parts[index] if index < len(parts) else None


# Transform that uses the custom handlers and validates output against the generated
# Opportunity model. common_model=Opportunity (from generated/schemas.py) ensures
# model_validate runs against the extended class with typed custom fields
# (legacyId, agencyName, applicantTypes), not just the base OpportunityBase.
to_common_with_custom, from_common_with_custom = build_transforms(
    to_common_mapping={
        "id": {"field": "data.opportunity_uuid"},
        "title": {"field": "data.opportunity_title"},
        "description": {"field": "data.opportunity_description"},
        "createdAt": {"field": "data.created_at"},
        "lastModifiedAt": {"field": "data.last_modified_at"},
        "status": {
            "value": {
                "match": {
                    "field": "data.opportunity_status",
                    "case": {
                        "posted": "open",
                        "archived": "closed",
                        "forecasted": "forecasted",
                    },
                    "default": "custom",
                }
            },
        },
        "label": {
            "join": {
                "fields": ["data.opportunity_number", "data.opportunity_title"],
                "sep": " — ",
            }
        },
        "customFields": {
            "legacyId": {
                "value": {"field": "data.opportunity_id"},
            },
            "agencyName": {
                "value": {"field": "data.agency_name"},
            },
            "applicantTypes": {
                "value": {"field": "data.summary.applicant_types"},
            },
        },
    },
    from_common_mapping={
        "data": {
            # label is produced by the join handler above but gets dropped by
            # model_validate (it is not a CG field), so from_common maps directly
            # from the standard CG title field instead.
            "opportunity_title": {"field": "title"},
        }
    },
    handlers={"join": join_fields, "split": split_field},
    common_model=Opportunity,
)


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)


def main() -> None:
    opp = plugin.schemas.Opportunity

    _section("SOURCE DATA (grants.gov format)")
    print(json.dumps(SOURCE_DATA, indent=2))

    # --- to_common: grants.gov → CommonGrants ---
    assert opp.to_common is not None
    cg_result = opp.to_common(SOURCE_DATA)

    _section("to_common: grants.gov → CommonGrants")
    if cg_result.errors:
        print(f"ERRORS ({len(cg_result.errors)}):")
        for err in cg_result.errors:
            print(f"  [path={err.path}] {err}")
    else:
        print("Errors: none")
    print("\nResult:")
    print(json.dumps(cg_result.result, indent=2))

    # --- from_common: CommonGrants → grants.gov ---
    assert opp.from_common is not None
    native_result = opp.from_common(cg_result.result)

    _section("from_common: CommonGrants → grants.gov")
    if native_result.errors:
        print(f"ERRORS ({len(native_result.errors)}):")
        for err in native_result.errors:
            print(f"  [path={err.path}] {err}")
    else:
        print("Errors: none")
    print("\nResult:")
    print(json.dumps(native_result.result, indent=2))

    # --- Roundtrip comparison ---
    # Note: SOURCE_DATA contains fields not covered by the mappings (agency_name,
    # opportunity_id, etc.). Those fields are intentionally absent from the roundtrip
    # output — the mapping layer is selective by design.
    _section("ROUNDTRIP CHECK")
    checks = [
        (
            "title",
            SOURCE_DATA["data"]["opportunity_title"],
            native_result.result.get("data", {}).get("opportunity_title"),
        ),
        (
            "status",
            SOURCE_DATA["data"]["opportunity_status"],
            native_result.result.get("data", {}).get("opportunity_status"),
        ),
        (
            "award_floor",
            SOURCE_DATA["data"]["summary"]["award_floor"],
            native_result.result.get("data", {}).get("summary", {}).get("award_floor"),
        ),
        (
            "award_ceiling",
            SOURCE_DATA["data"]["summary"]["award_ceiling"],
            native_result.result.get("data", {})
            .get("summary", {})
            .get("award_ceiling"),
        ),
        (
            "priority_score_str",
            SOURCE_DATA["data"]["priority_score_str"],
            native_result.result.get("data", {}).get("priority_score_str"),
        ),
    ]
    all_pass = True
    for field, original, roundtripped in checks:
        ok = original == roundtripped
        if not ok:
            all_pass = False
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {field}: {original!r} -> {roundtripped!r}")

    print(
        f"\nRoundtrip result ({len(checks)} mapped fields checked; unmapped fields dropped by design): {'ALL PASS' if all_pass else 'SOME FIELDS DIFFER'}"
    )

    # --- Custom handler + model_validate demo ---
    _section(
        "CUSTOM HANDLER + MODEL VALIDATE DEMO (join / split / extended Opportunity)"
    )
    print("Custom handlers: join, split")
    print("common_model: generated Opportunity (with typed customFields)\n")

    custom_cg = to_common_with_custom(SOURCE_DATA)

    if custom_cg.errors:
        print(f"ERRORS ({len(custom_cg.errors)}):")
        for err in custom_cg.errors:
            print(f"  [path={err.path}] {err}")
    else:
        print("Validation: PASS — result is a typed Opportunity instance")
        assert isinstance(custom_cg.result, Opportunity)
        opp_instance = custom_cg.result
        print(f"\n  title:       {opp_instance.title}")
        print(f"  id:          {opp_instance.id}")
        print(f"  status:      {opp_instance.status.value}")
        if opp_instance.custom_fields:
            cf = opp_instance.custom_fields
            print("\n  customFields (typed):")
            if cf.legacy_id:
                print(
                    f"    legacyId.value:        {cf.legacy_id.value!r}  ({type(cf.legacy_id.value).__name__})"
                )
            if cf.agency_name:
                print(
                    f"    agencyName.value:      {cf.agency_name.value!r}  ({type(cf.agency_name.value).__name__})"
                )
            if cf.applicant_types:
                print(
                    f"    applicantTypes.value:  {cf.applicant_types.value!r}  ({type(cf.applicant_types.value).__name__})"
                )

    custom_native = from_common_with_custom(
        custom_cg.result if not custom_cg.errors else {}
    )
    orig_title = SOURCE_DATA["data"]["opportunity_title"]
    rt_title = custom_native.result.get("data", {}).get("opportunity_title")
    print(
        f"\n  [{'PASS' if orig_title == rt_title else 'FAIL'}] opportunity_title: {orig_title!r} -> {rt_title!r}"
    )

    # --- Plugin metadata ---
    _section("PLUGIN METADATA")
    assert plugin.meta is not None
    print(f"name:         {plugin.meta.name}")
    print(f"version:      {plugin.meta.version}")
    print(f"sourceSystem: {plugin.meta.source_system}")
    print(f"capabilities: {plugin.meta.capabilities}")


if __name__ == "__main__":
    main()
