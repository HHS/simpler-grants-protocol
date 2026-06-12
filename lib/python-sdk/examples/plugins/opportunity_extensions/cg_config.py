"""
Plugin configuration for opportunity extensions.

Defines custom field extensions for the Opportunity schema:
- HHS-specific fields (programArea, legacyGrantId)
- Local fields (eligibilityTypes, awardCeiling)
"""

from typing import Any

from common_grants_sdk import define_plugin
from common_grants_sdk.extensions import CustomFieldSpec, SchemaInput
from common_grants_sdk.extensions.plugin import PluginConfig
from common_grants_sdk.schemas.pydantic.fields.custom import CustomFieldType

config: PluginConfig[Any] = define_plugin(
    schemas={
        "Opportunity": SchemaInput(
            custom_fields={
                "programArea": CustomFieldSpec(
                    field_type=CustomFieldType.STRING,
                    description="HHS program area code (e.g. 'CFDA-93.243')",
                ),
                "legacyGrantId": CustomFieldSpec(
                    field_type=CustomFieldType.INTEGER,
                    description="Numeric ID from the legacy grants management system",
                ),
                "eligibilityTypes": CustomFieldSpec(
                    field_type=CustomFieldType.ARRAY,
                    description="Types of organizations eligible to apply",
                ),
                "awardCeiling": CustomFieldSpec(
                    field_type=CustomFieldType.NUMBER,
                    description="Maximum award amount in USD",
                ),
            }
        )
    }
)
