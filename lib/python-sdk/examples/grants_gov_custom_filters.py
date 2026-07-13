#!/usr/bin/env python3
"""Custom-filter search against Simpler.Grants.gov, via the cg-grants-gov plugin.

The downstream flow an adopter writes:

  1. Import the plugin (``cg_grants_gov.grants_gov``). It already registers the
     grants.gov search custom filters — agency, applicantType, fundingInstrument,
     costSharing — so the consumer doesn't declare them.
  2. Build a flat filter dict with the ``f.*`` builders: a default core filter
     (``status``) plus the four registered customs.
  3. ``plugin.get_client(config)`` returns a client with the plugin's routes and
     schemas bound, so ``opportunities.search(filters=...)`` is typed by the
     registered filters and rows parse as grants.gov opportunities.

The client classifies the flat dict into the three-bucket request body — the
default filter stays a top-level field, the four customs go under
``customFilters`` — and POSTs it. How a deployment applies custom filters is its
own concern; this example shows the body the SDK builds and the typed results.

Run against a CommonGrants endpoint on http://localhost:8080:

    poetry run python examples/grants_gov_custom_filters.py [searchTerm]
"""

from __future__ import annotations

import json
import sys

from cg_grants_gov import OppSearchFilters, grants_gov

from common_grants_sdk.client.config import Config
from common_grants_sdk.extensions import classify_filters, f

# =============================================================================
# Config
# =============================================================================

search_term = sys.argv[1] if len(sys.argv) > 1 else "education"
api_key = "two_org_user_key"
base_url = "http://localhost:8080"
config = Config(base_url=base_url, api_key=api_key, timeout=5.0)


# =============================================================================
# Main
# =============================================================================


def main() -> None:
    print("=== Grants.gov Custom-Filter Search ===")
    print(f"Search term: {search_term!r}")
    print(f"Base URL:    {base_url}\n")

    # A consumer's flat filter dict: one default core filter + four grants.gov
    # customs. Each f.* builder returns the precise value model the registered
    # filter expects; the OppSearchFilters annotation is what makes
    # search(filters=...) typecheck against the plugin's registered filters.
    filters: OppSearchFilters = {
        "status": f.in_(["open", "forecasted"]),
        "agency": f.in_(["HHS", "USDA"]),
        "applicantType": f.in_(["government_state", "government_county"]),
        "fundingInstrument": f.in_(["grant", "cooperative_agreement"]),
        "costSharing": f.eq(False),
    }

    # The request body the client will POST. Shown here (via classify_filters,
    # which get_client runs internally) so the customFilters split is visible
    # without a live endpoint: status stays top-level, the four customs land in
    # customFilters. classify_filters returns the body directly and raises
    # FilterError on a bad value (fail-fast) — these filters are all valid.
    body = classify_filters(
        grants_gov.routes, "opportunities", "search", filters
    ).model_dump(by_alias=True, exclude_none=True, mode="json")
    print("Request body (default fields + customFilters):")
    print(json.dumps(body, indent=2), "\n")

    # get_client binds the plugin's routes + schemas: search(filters=...) is typed
    # by the registered filters and rows parse as grants.gov opportunities.
    client = grants_gov.get_client(config)
    response = client.opportunities.search(search=search_term, filters=filters)

    print(f"{len(response.items)} opportunit(y/ies) matched:")
    for opp in response.items:
        print(f"  - {opp.title} [{opp.status.value}] ({opp.id})")
    if response.errors:
        print(f"\n{len(response.errors)} row(s) failed to parse:")
        for err in response.errors:
            print(f"  - {err}")


if __name__ == "__main__":
    main()
