from common_grants_sdk import define_plugin, merge_extensions
from common_grants_sdk.extensions import CustomFieldSpec
from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema
from common_grants_sdk.schemas.pydantic.fields.custom import CustomFieldType

hhs_extensions = PluginExtensions(
    schemas={
        "Opportunity": PluginExtensionsSchema(
            customFields={
                "programArea": CustomFieldSpec(
                    field_type=CustomFieldType.STRING,
                    description="HHS program area code (e.g. 'CFDA-93.243')",
                ),
                "legacyGrantId": CustomFieldSpec(
                    field_type=CustomFieldType.INTEGER,
                    description="Numeric ID from the legacy grants management system",
                ),
            }
        )
    }
)

local_extensions = PluginExtensions(
    schemas={
        "Opportunity": PluginExtensionsSchema(
            customFields={
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

config = define_plugin(
    extensions=merge_extensions(
        [hhs_extensions, local_extensions], on_conflict="error"
    ),
)
