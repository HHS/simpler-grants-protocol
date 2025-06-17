"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import re
import uuid
from typing import Any

from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.schemas.models import OppStatusOptions

from .date_transform import DateFormat, transform_date


class OpportunityTransformer:
    """Transformer for California Grants Portal data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the CA Grants mapping."""

    def transform_opportunities(
        self,
        source_data: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Transform list of CA opportunities to CommonGrants format.

        Args:
            source_data: List of CA Grants Portal opportunity data dictionaries

        Returns:
            List of opportunities in CommonGrants format

        Raises:
            ValueError: If transformation fails or source data is malformed

        """
        try:
            # Transform each grant opportunity
            result = [self.transform_opportunity(o) for o in source_data]

        except Exception as e:
            error_msg = f"Error transforming data: {e!s}"
            raise ValueError(error_msg) from e

        else:
            return result

    def transform_opportunity(
        self,
        source: dict[str, Any],
    ) -> dict[str, Any]:
        """Transform CA opportunity data to CommonGrants format."""
        return {
            "id": uuid.uuid5(uuid.NAMESPACE_DNS, "data.ca.gov"),
            "title": source.get("Title"),
            "description": source.get("Description"),
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
                "appOpens": {
                    "name": "Application Opens",
                    "date": transform_date(
                        source.get("OpenDate", "TBD"),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Applications accepted beginning this date",
                },
                "appDeadline": {
                    "name": "Application Deadline",
                    "date": transform_date(
                        source.get("ApplicationDeadline", "TBD"),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Final deadline for all submissions",
                },
                "otherDates": {
                    "expAwardDate": {
                        "name": "Expected Award Date",
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
                    "type": CustomFieldType.STRING,
                    "value": source.get("PortalID"),
                    "description": "CA Portal ID",
                },
                "agencyDept": {
                    "name": "Agency Department",
                    "type": CustomFieldType.STRING,
                    "value": source.get("AgencyDept"),
                    "description": "Agency department",
                },
                "categories": {
                    "name": "Categories",
                    "type": CustomFieldType.STRING,
                    "value": source.get("Categories"),
                    "description": "Categories",
                },
                "categorySuggestion": {
                    "name": "Category Suggestion",
                    "type": CustomFieldType.STRING,
                    "value": source.get("CategorySuggestion"),
                    "description": "Category suggestion",
                },
                "purpose": {
                    "name": "Purpose",
                    "type": CustomFieldType.STRING,
                    "value": source.get("Purpose"),
                    "description": "Purpose",
                },
                "agencyURL": {
                    "name": "Agency URL",
                    "type": CustomFieldType.STRING,
                    "value": source.get("AgencyURL"),
                    "description": "Agency URL",
                },
                "applicantType": {
                    "name": "Applicant Type",
                    "type": CustomFieldType.STRING,
                    "value": source.get("ApplicantType"),
                    "description": "Applicant Type",
                },
                "applicantTypeNotes": {
                    "name": "Applicant Type Notes",
                    "type": CustomFieldType.STRING,
                    "value": source.get("ApplicantTypeNotes"),
                    "description": "Applicant Type Notes",
                },
                "geography": {
                    "name": "Geography",
                    "type": CustomFieldType.STRING,
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
