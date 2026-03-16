"""Example demonstrating how to use the plugin framework to validate and
access typed custom fields on an Opportunity.

Before running this script, generate the typed models by running this
command from the plugin directory:

    cd examples/plugins/opportunity_extensions
    poetry run python -m common_grants_sdk.generate

Then run this script from the lib/python-sdk directory:

    poetry run python examples/plugin_custom_fields.py
"""

import sys
from pathlib import Path

# Make the examples/ directory importable so that
# plugins.opportunity_extensions resolves correctly.
sys.path.insert(0, str(Path(__file__).parent))

from common_grants_sdk.schemas.pydantic.models import OpportunityBase  # noqa: E402
from plugins.opportunity_extensions import opportunity_extensions  # noqa: E402


# ---------------------------------------------------------------------------
# Sample API payload containing our four custom fields
# ---------------------------------------------------------------------------

api_response = {
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Community Health Innovation Grant",
    "status": {"value": "open"},
    "description": "Funding for community-led health initiatives",
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-15T00:00:00Z",
    "customFields": {
        "program_area": {
            "fieldType": "string",
            "value": "CFDA-93.243",
        },
        "legacy_grant_id": {
            "fieldType": "integer",
            "value": 98765,
        },
        "eligibility_types": {
            "fieldType": "array",
            "value": ["nonprofit", "tribal", "city_government"],
        },
        "award_ceiling": {
            "fieldType": "number",
            "value": 250000.00,
        },
    },
}

# ---------------------------------------------------------------------------
# Option A: use the model returned via opportunity_extensions
# ---------------------------------------------------------------------------

opp = opportunity_extensions.schemas.Opportunity.model_validate(api_response)

print(
    "--- Option A: via opportunity_extensions.scehmas.Opportunity.model_validate() return value ---"
)
print(f"Title:            {opp.title}")
print(f"Status:           {opp.status.value}")
print(f"program_area:     {opp.custom_fields.program_area.value}")
print(f"legacy_grant_id:  {opp.custom_fields.legacy_grant_id.value}")
print(f"eligibility_types:{opp.custom_fields.eligibility_types.value}")
print(f"award_ceiling:    {opp.custom_fields.award_ceiling.value}")
print()

# ---------------------------------------------------------------------------
# Option B: retrieve the registered schema from OpportunityBase later.
# Useful when the registration happens at startup (e.g. in an app factory)
# and the extended model is needed elsewhere in the codebase.
# ---------------------------------------------------------------------------

ExtendedOpportunity = OpportunityBase.registered_schema()
opp2 = ExtendedOpportunity.model_validate(api_response)

print("--- Option B: via OpportunityBase.registered_schema() ---")
print(f"Title:            {opp2.title}")
print(f"program_area:     {opp2.custom_fields.program_area.value}")
print()

# ---------------------------------------------------------------------------
# The plugin also exposes the original extension specs
# ---------------------------------------------------------------------------

print("Registered extensions:")
for field_name, spec in opportunity_extensions.extensions["Opportunity"].items():
    print(f"  {field_name}: {spec.field_type} — {spec.description}")
