#!/usr/bin/env python3
"""Round-trip validation using the cg-grants-gov plugin.

Fetches a real opportunity from Simpler.Grants.gov, transforms it to
CommonGrants format via ``to_common``, then back to the source format via
``from_common``, and validates that key fields were preserved.


Run with: poetry run python examples/grants_gov_transforms.py <opportunityId>
          or set GRANTS_GOV_OPP_ID and omit the argument.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from cg_grants_gov import GrantsGovOpportunitySchema, grants_gov


from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config

# =============================================================================
# Config
# =============================================================================

opp_id = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GRANTS_GOV_OPP_ID")
api_key = "two_org_user_key"
base_url = "http://localhost:8080"
config = Config(
    base_url=base_url,
    api_key="two_org_user_key",
    timeout=5.0,
)
client = Client(config)

# =============================================================================
# Helpers
# =============================================================================


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  PASS  {label}")
    else:
        suffix = f"\n        {detail}" if detail else ""
        print(f"  FAIL  {label}{suffix}", file=sys.stderr)
        sys.exit(1)


def to_json(obj: Any) -> str:
    """Serialize a Pydantic model or plain dict to pretty-printed JSON."""
    if hasattr(obj, "model_dump"):
        data = obj.model_dump(mode="json")
    else:
        data = obj
    return json.dumps(data, indent=2, default=str)


def deep_diff(
    a: Any,
    b: Any,
    path: str = "",
    diffs: list[tuple[str, Any, Any]] | None = None,
) -> list[tuple[str, Any, Any]]:
    """Recursively collect (path, a_val, b_val) for every leaf that differs."""
    if diffs is None:
        diffs = []
    if isinstance(a, dict) and isinstance(b, dict):
        all_keys = set(a) | set(b)
        for k in sorted(all_keys):
            deep_diff(a.get(k), b.get(k), f"{path}.{k}" if path else k, diffs)
    elif isinstance(a, list) and isinstance(b, list):
        for i, (av, bv) in enumerate(zip(a, b)):
            deep_diff(av, bv, f"{path}[{i}]", diffs)
        if len(a) != len(b):
            diffs.append((f"{path}[len]", len(a), len(b)))
    else:
        if a != b:
            diffs.append((path, a, b))
    return diffs


# =============================================================================
# Main
# =============================================================================


def main() -> None:
    print("=== Grants.gov Round-Trip Transform ===")
    print(f"Opportunity: {opp_id}")
    print(f"Base URL:    {base_url}\n")

    # 1. Fetch raw opportunity from Simpler.Grants.gov
    print("Fetching opportunity...")
    url = f"/v1/opportunities/{opp_id}"
    response = client.get(url)
    response.raise_for_status()
    body = response.json()
    print("  fetched OK\n")
    print(f"=== [1] RAW API RESPONSE ===\n{to_json(body['data'])}\n")

    # 2. Validate raw response shape
    print("Validating raw response...")
    raw = GrantsGovOpportunitySchema.model_validate(body["data"])
    print("  validated OK\n")

    # 3. to_common
    print("Running to_common...")
    tr1 = grants_gov.schemas.Opportunity.to_common(raw)  # type: ignore[attr-defined]
    if tr1.errors:
        errs = "; ".join(f"[{e.path or '?'}] {e}" for e in tr1.errors)
        print(f"  FAIL  to_common produced errors: {errs}", file=sys.stderr)
        sys.exit(1)
    common = tr1.result
    print("  to_common OK\n")
    print(f"=== [2] COMMON (to_common output) ===\n{to_json(common)}\n")
    # 4. from_common
    print("Running from_common...")
    tr2 = grants_gov.schemas.Opportunity.from_common(common)  # type: ignore[attr-defined]
    if tr2.errors:
        errs = "; ".join(f"[{e.path or '?'}] {e}" for e in tr2.errors)
        print(f"  FAIL  from_common produced errors: {errs}", file=sys.stderr)
        sys.exit(1)
    back = tr2.result
    print("  from_common OK\n")
    print(f"=== [3] BACK (from_common output) ===\n{to_json(back)}\n")

    # 5. Validate round-trip field preservation
    print("Validating round-trip field preservation...")

    # --- Exact match ---
    check(
        "opportunity_id round-trips",
        str(back.opportunity_id) == str(raw.opportunity_id),
        f"expected {raw.opportunity_id}, got {back.opportunity_id}",
    )

    check(
        "opportunity_number round-trips",
        back.opportunity_number == raw.opportunity_number,
        f"expected {raw.opportunity_number!r}, got {back.opportunity_number!r}",
    )

    check(
        "agency_code round-trips",
        back.agency_code == raw.agency_code,
        f"expected {raw.agency_code!r}, got {back.agency_code!r}",
    )

    check(
        "agency_name round-trips",
        back.agency_name == raw.agency_name,
        f"expected {raw.agency_name!r}, got {back.agency_name!r}",
    )

    # --- Semantic match ---
    # Status: posted→open→posted, archived→closed→closed, forecasted→forecasted→forecasted
    expected_status: dict[str, str] = {
        "posted": "posted",
        "archived": "closed",
        "forecasted": "forecasted",
        "closed": "closed",
    }
    expected_back_status = expected_status.get(raw.opportunity_status, "posted")
    check(
        f"opportunity_status semantic ({raw.opportunity_status} → ... → {expected_back_status})",
        back.opportunity_status == expected_back_status,
        f"expected {expected_back_status!r}, got {back.opportunity_status!r}",
    )

    # Funding amounts (skip if null in source)
    raw_floor = raw.summary.award_floor if raw.summary else None
    raw_ceiling = raw.summary.award_ceiling if raw.summary else None
    back_floor = back.summary.award_floor if back.summary else None
    back_ceiling = back.summary.award_ceiling if back.summary else None

    if raw_floor is not None:
        check(
            f"award_floor round-trips ({raw_floor})",
            back_floor == raw_floor,
            f"expected {raw_floor}, got {back_floor}",
        )
    else:
        print("  PASS  award_floor (null in source — skipped)")

    if raw_ceiling is not None:
        check(
            f"award_ceiling round-trips ({raw_ceiling})",
            back_ceiling == raw_ceiling,
            f"expected {raw_ceiling}, got {back_ceiling}",
        )
    else:
        print("  PASS  award_ceiling (null in source — skipped)")

    # --- Presence check ---
    check(
        "opportunity_title preserved",
        back.opportunity_title == raw.opportunity_title,
        f"expected {raw.opportunity_title!r}, got {back.opportunity_title!r}",
    )

    check(
        "created_at non-null",
        back.created_at is not None,
        f"got: {back.created_at!r}",
    )

    check(
        "updated_at non-null",
        back.updated_at is not None,
        f"got: {back.updated_at!r}",
    )

    raw_listing_count = len(raw.opportunity_assistance_listings)
    back_listing_count = len(back.opportunity_assistance_listings)
    check(
        "assistance_listings count preserved",
        back_listing_count == raw_listing_count,
        f"expected {raw_listing_count}, got {back_listing_count}",
    )

    # --- Full deep comparison: raw vs back ---
    print("\nRunning deep diff (raw vs from_common)...")
    raw_dict = raw.model_dump(mode="json")
    back_dict = back.model_dump(mode="json")
    diffs = deep_diff(raw_dict, back_dict)
    if diffs:
        print(f"  {len(diffs)} field(s) differ after round-trip:")
        for path, a_val, b_val in diffs:
            print(f"    {path}")
            print(f"      raw:  {a_val!r}")
            print(f"      back: {b_val!r}")
    else:
        print("  PASS  all fields identical after round-trip")

    print("\n=== All checks passed ===")


if __name__ == "__main__":
    main()
