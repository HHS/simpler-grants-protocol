"""Plugin config for the opportunity_extensions example.

Defines four custom fields for the Opportunity model and registers them
with the CommonGrants SDK plugin framework.

To generate the typed Pydantic models, run this command from this directory:

    poetry run python -m common_grants_sdk.generate

This will emit generated/ and __init__.py alongside this file.
"""

from common_grants_sdk import define_plugin, compose
from common_grants_sdk.types import CustomFieldSpec, SchemaExtensions

# Extensions that might come from a shared HHS package
hhs_extensions: SchemaExtensions = {
    "Opportunity": {
        "program_area": CustomFieldSpec(
            field_type="string",
            description="HHS program area code (e.g. 'CFDA-93.243')",
        ),
        "legacy_grant_id": CustomFieldSpec(
            field_type="integer",
            description="Numeric ID from the legacy grants management system",
        ),
    },
}

# Extensions specific to this project
local_extensions: SchemaExtensions = {
    "Opportunity": {
        "eligibility_types": CustomFieldSpec(
            field_type="array",
            description="Types of organizations eligible to apply (e.g. 'nonprofit', 'tribal')",
        ),
        "award_ceiling": CustomFieldSpec(
            field_type="number",
            description="Maximum award amount in USD",
        ),
    },
}

config = define_plugin(
    compose([hhs_extensions, local_extensions], on_conflict="error"),
)
