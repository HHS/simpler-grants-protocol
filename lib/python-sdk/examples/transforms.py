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

    # --- Plugin metadata ---
    _section("PLUGIN METADATA")
    assert plugin.meta is not None
    print(f"name:         {plugin.meta.name}")
    print(f"version:      {plugin.meta.version}")
    print(f"sourceSystem: {plugin.meta.source_system}")
    print(f"capabilities: {plugin.meta.capabilities}")


if __name__ == "__main__":
    main()
