"""Example demonstrating how to use the plugin framework to validate and
access typed custom fields on an Opportunity.

Before running this script, generate the typed models by running this
command from the plugin directory:

    lib/python-sdk
    poetry run python -m common_grants_sdk.extensions.generate --plugin examples/plugins/opportunity_extensions

Then run this script from the lib/python-sdk directory:

    poetry run python examples/plugin_custom_fields.py
"""

import sys
from pathlib import Path

# Make the examples/ directory importable so that
# plugins.opportunity_extensions resolves correctly.
sys.path.insert(0, str(Path(__file__).parent))

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
        "programArea": {
            "fieldType": "string",
            "value": "CFDA-93.243",
        },
        "legacyGrantId": {
            "fieldType": "integer",
            "value": 98765,
        },
        "eligibilityTypes": {
            "fieldType": "array",
            "value": ["nonprofit", "tribal", "city_government"],
        },
        "awardCeiling": {
            "fieldType": "number",
            "value": 250000.00,
        },
    },
}

# ---------------------------------------------------------------------------
# Use the model returned via opportunity_extensions
# ---------------------------------------------------------------------------

opp = opportunity_extensions.schemas.Opportunity.model_validate(api_response)

assert opp.custom_fields is not None
assert opp.custom_fields.program_area is not None
assert opp.custom_fields.legacy_grant_id is not None
assert opp.custom_fields.eligibility_types is not None
assert opp.custom_fields.award_ceiling is not None

print(f"Title:            {opp.title}")
print(f"Status:           {opp.status.value}")
print(f"program_area:     {opp.custom_fields.program_area.value}")
print(f"legacy_grant_id:  {opp.custom_fields.legacy_grant_id.value}")
print(f"eligibility_types:{opp.custom_fields.eligibility_types.value}")
print(f"award_ceiling:    {opp.custom_fields.award_ceiling.value}")
print()

# ---------------------------------------------------------------------------
# The plugin also exposes the original extension specs
# ---------------------------------------------------------------------------

print("Registered extensions:")
for field_name, spec in opportunity_extensions.extensions["Opportunity"].items():
    print(f"  {field_name}: {spec.field_type} — {spec.description}")
