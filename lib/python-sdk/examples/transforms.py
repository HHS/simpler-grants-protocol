#!/usr/bin/env python3
"""Bidirectional transform PoC — plugin transformation interface.

Demonstrates source (grants.gov) → CommonGrants and CommonGrants → source
bidirectional transformations using the grants.gov sample plugin.

Run with (from lib/python-sdk/):
    poetry run python examples/transforms.py
"""

from __future__ import annotations

import json
from typing import Any

# When run as `poetry run python examples/transforms.py`, Python automatically
# adds the script's directory (examples/) to sys.path. Import from there using
# the `plugins.` prefix (not `examples.plugins.`) — the `examples.` prefix only
# works in -c or interactive contexts where lib/python-sdk/ is sys.path[0].
from plugins.grants_gov.cg_config import plugin

from common_grants_sdk.extensions import build_transforms
from common_grants_sdk.utils.transformation import get_from_path

# ---------------------------------------------------------------------------
# Sample grants.gov source data
# ---------------------------------------------------------------------------

SOURCE_DATA: dict[str, Any] = {
    "data": {
        "agency_name": "Department of Examples",
        "opportunity_id": 12345,
        "opportunity_number": "ABC-123-XYZ-001",
        "opportunity_status": "posted",
        "opportunity_title": "Research into conservation techniques",
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


# Transform that uses the custom handlers — built independently of the plugin
# above to show that build_transforms() accepts arbitrary handler dicts.
to_common_with_custom, from_common_with_custom = build_transforms(
    to_common_mapping={
        "title": {"field": "data.opportunity_title"},
        "label": {
            "join": {
                "fields": ["data.opportunity_number", "data.opportunity_title"],
                "sep": " — ",
            }
        },
    },
    from_common_mapping={
        "data": {
            "opportunity_number": {
                "split": {"field": "label", "sep": " — ", "index": 0}
            },
            "opportunity_title": {
                "split": {"field": "label", "sep": " — ", "index": 1}
            },
        }
    },
    handlers={"join": join_fields, "split": split_field},
)


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)


def main() -> None:
    assert plugin.transform_schemas is not None
    opp = plugin.transform_schemas["Opportunity"]

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
    ]
    all_pass = True
    for field, original, roundtripped in checks:
        ok = original == roundtripped
        if not ok:
            all_pass = False
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {field}: {original!r} -> {roundtripped!r}")

    print(f"\nRoundtrip result: {'ALL PASS' if all_pass else 'SOME FIELDS DIFFER'}")

    # --- Custom handler demo ---
    _section("CUSTOM HANDLER DEMO (join / split)")
    print("Custom handlers passed to build_transforms(): join, split\n")

    custom_cg = to_common_with_custom(SOURCE_DATA)
    print("to_common (with join handler):")
    print(json.dumps(custom_cg.result, indent=2))

    custom_native = from_common_with_custom(custom_cg.result)
    print("\nfrom_common (with split handler):")
    print(json.dumps(custom_native.result, indent=2))

    orig_num = SOURCE_DATA["data"]["opportunity_number"]
    orig_title = SOURCE_DATA["data"]["opportunity_title"]
    rt_num = custom_native.result.get("data", {}).get("opportunity_number")
    rt_title = custom_native.result.get("data", {}).get("opportunity_title")
    print(
        f"\n  [{'PASS' if orig_num == rt_num else 'FAIL'}] opportunity_number: {orig_num!r} -> {rt_num!r}"
    )
    print(
        f"  [{'PASS' if orig_title == rt_title else 'FAIL'}] opportunity_title:  {orig_title!r} -> {rt_title!r}"
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
