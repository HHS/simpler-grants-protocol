"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import re
from typing import Any
from uuid import uuid5

from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.models import OpportunityBase, OppStatusOptions

from common_grants.constants import CA_OPPORTUNITY_NAMESPACE

from .date_transform import DateFormat, transform_date

# CA-specific custom field specs for typed validation and serialization via the SDK.
CA_CUSTOM_FIELD_SPECS: dict[str, CustomFieldSpec] = {
    "portalID": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Portal ID",
        description="CA Portal ID",
    ),
    "agencyDept": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Agency Department",
        description="Agency department",
    ),
    "categories": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Categories",
        description="Categories",
    ),
    "categorySuggestion": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Category Suggestion",
        description="Category suggestion",
    ),
    "purpose": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Purpose",
        description="Purpose",
    ),
    "agencyURL": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Agency URL",
        description="Agency URL",
    ),
    "applicantType": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Applicant Type",
        description="Applicant Type",
    ),
    "applicantTypeNotes": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Applicant Type Notes",
        description="Applicant Type Notes",
    ),
    "geography": CustomFieldSpec(
        field_type=CustomFieldType.STRING,
        value=str,
        name="Geography",
        description="Geography",
    ),
}

# Extended Opportunity model with CA custom fields for validation and serialization.
CAOpportunity = OpportunityBase.with_custom_fields(
    custom_fields=CA_CUSTOM_FIELD_SPECS,
    model_name="CAOpportunity",
)


class OpportunityTransformer:
    """Transformer for California Grants Portal data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the CA Grants mapping."""

    def transform_opportunities(
        self,
        source_data: list[dict[str, Any]],
    ) -> list[Any]:
        """
        Transform list of CA opportunities to CommonGrants format.

        Args:
            source_data: List of CA Grants Portal opportunity data dictionaries

        Returns:
            List of CAOpportunity model instances (validated and serializable via SDK).

        Raises:
            ValueError: If transformation fails or source data is malformed

        """
        try:
            result = [self.transform_opportunity(o) for o in source_data]
        except Exception as e:
            error_msg = f"Error transforming data: {e!s}"
            raise ValueError(error_msg) from e
        return result

    def transform_opportunity(
        self,
        source: dict[str, Any],
    ) -> Any:  # noqa: ANN401
        """Transform CA opportunity data to CommonGrants format and validate via CAOpportunity."""
        portal_id = source.get("PortalID", "")
        if not portal_id:
            error_msg = "Opportunity must have a PortalID for ID generation"
            raise ValueError(error_msg)

        opp_dict = {
            "id": uuid5(CA_OPPORTUNITY_NAMESPACE, portal_id),
            "title": source.get("Title") or "",
            "description": source.get("Description") or "",
            "status": {
                "value": self.transform_status(str(source.get("Status", ""))),
                "description": "Opportunity is actively accepting applications",
            },
            "funding": {
                "totalAmountAvailable": {
                    "amount": self.transform_money(
                        str(source.get("EstAvailFunds", "0")),
                    ),
                    "currency": "USD",
                },
                "minAwardAmount": {
                    "amount": self.transform_money(str(source.get("EstAmounts", "0"))),
                    "currency": "USD",
                },
                "maxAwardAmount": {
                    "amount": self.transform_money(str(source.get("EstAmounts", "0"))),
                    "currency": "USD",
                },
            },
            "keyDates": {
                "postDate": {
                    "name": "Application Opens",
                    "eventType": "singleDate",
                    "date": transform_date(
                        source.get("OpenDate", "TBD"),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Applications accepted beginning this date",
                },
                "closeDate": {
                    "name": "Application Deadline",
                    "eventType": "singleDate",
                    "date": transform_date(
                        source.get("ApplicationDeadline", "TBD"),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Final deadline for all submissions",
                },
                "otherDates": {
                    "expAwardDate": {
                        "name": "Expected Award Date",
                        "eventType": "singleDate",
                        "date": transform_date(
                            source.get("ExpAwardDate", "TBD"),
                            DateFormat.SHORT,
                        ).date(),
                        "description": "Expected date of award announcement.",
                    },
                },
            },
            "source": source.get("GrantURL"),
            "customFields": {
                "portalID": {
                    "name": "Portal ID",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("PortalID"),
                    "description": "CA Portal ID",
                },
                "agencyDept": {
                    "name": "Agency Department",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("AgencyDept"),
                    "description": "Agency department",
                },
                "categories": {
                    "name": "Categories",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("Categories"),
                    "description": "Categories",
                },
                "categorySuggestion": {
                    "name": "Category Suggestion",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("CategorySuggestion"),
                    "description": "Category suggestion",
                },
                "purpose": {
                    "name": "Purpose",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("Purpose"),
                    "description": "Purpose",
                },
                "agencyURL": {
                    "name": "Agency URL",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("AgencyURL"),
                    "description": "Agency URL",
                },
                "applicantType": {
                    "name": "Applicant Type",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("ApplicantType"),
                    "description": "Applicant Type",
                },
                "applicantTypeNotes": {
                    "name": "Applicant Type Notes",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("ApplicantTypeNotes"),
                    "description": "Applicant Type Notes",
                },
                "geography": {
                    "name": "Geography",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("Geography"),
                    "description": "Geography",
                },
            },
            "createdAt": transform_date(
                source.get("LastUpdated", "TBD"),
                DateFormat.LONG,
            ),
            "lastModifiedAt": transform_date(
                source.get("LastUpdated", "TBD"),
                DateFormat.LONG,
            ),
        }
        return CAOpportunity.model_validate(opp_dict)

    def transform_money(self, value: str) -> str:
        """Strip non-digit characters from monetary strings."""
        return re.sub(r"[^\d]", "", value) or "0"

    def transform_status(self, value: str) -> OppStatusOptions:
        """Transform CA opportunity status value to CommonGrants format."""
        match value:
            case "active":
                return OppStatusOptions.OPEN
            case "forecasted":
                return OppStatusOptions.FORECASTED
            case "closed":
                return OppStatusOptions.CLOSED
        return OppStatusOptions.CUSTOM
