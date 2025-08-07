"""
Transformer module for converting PA Grants data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
Pennsylvania Grants API format to the CommonGrants Protocol format.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.schemas.models import OppStatusOptions
from pydantic import AnyUrl, ValidationError


class OpportunityTransformer:
    """Transformer for Pennsylvania Grants data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the PA Grants mapping."""

    def transform_opportunities(
        self,
        source_data: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Transform list of PA opportunities to CommonGrants format.

        Args:
            source_data: List of PA Grants opportunity data dictionaries

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
        """Transform PA opportunity data to CommonGrants format."""
        return {
            "id": uuid.uuid5(uuid.NAMESPACE_DNS, "egrants-apibeta.azurewebsites.net"),
            "title": source.get("title"),
            "description": source.get("overview"),
            "status": {
                "value": self.transform_status(str(source.get("status", ""))),
                "description": "Opportunity status from Pennsylvania Grants API",
            },
            "funding": {
                "totalAmountAvailable": {
                    "amount": self.transform_money(
                        str(source.get("totalFundsToBeAwarded", "0")),
                    ),
                    "currency": "USD",
                },
                "minAwardAmount": {
                    "amount": self.transform_money(
                        str(source.get("minimumAward", "0")),
                    ),
                    "currency": "USD",
                },
                "maxAwardAmount": {
                    "amount": self.transform_money(
                        str(source.get("maximumAward", "0")),
                    ),
                    "currency": "USD",
                },
            },
            "keyDates": {
                "appOpens": {
                    "name": "Application Opens",
                    "date": self.parse_date(source.get("openDate")).date(),
                    "description": "Applications accepted beginning this date",
                },
                "appDeadline": {
                    "name": "Application Deadline",
                    "date": self.parse_date(source.get("closeDate")).date(),
                    "description": "Final deadline for all submissions",
                },
                "otherDates": {
                    "decisionDate": {
                        "name": "Decision Date",
                        "date": self.parse_date(source.get("decisionDate")).date(),
                        "description": "Expected date of award decision.",
                    },
                    "anticipatedFundingDate": {
                        "name": "Anticipated Funding Date",
                        "date": self.parse_date(
                            source.get("anticipatedFundingDate"),
                        ).date(),
                        "description": "Expected date of funding disbursement.",
                    },
                },
            },
            "source": self.parse_url(source.get("linkToApply")),
            "customFields": {
                "slug": {
                    "name": "Slug",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("slug"),
                    "description": "PA Grants API slug identifier",
                },
                "category": {
                    "name": "Category",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("category"),
                    "description": "Grant category",
                },
                "issuingAgency": {
                    "name": "Issuing Agency",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("issuingAgency"),
                    "description": "Agency issuing the grant",
                },
                "shortIssuingAgency": {
                    "name": "Short Issuing Agency",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("shortIssuingAgency"),
                    "description": "Short agency identifier",
                },
                "grantCycle": {
                    "name": "Grant Cycle",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("grantCycle"),
                    "description": "Grant cycle information",
                },
                "fundingType": {
                    "name": "Funding Type",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("fundingType"),
                    "description": "Type of funding provided",
                },
                "fundingSource": {
                    "name": "Funding Source",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("fundingSource"),
                    "description": "Source of funding",
                },
                "issuingAgencyUrl": {
                    "name": "Issuing Agency URL",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("issuingAgencyUrl"),
                    "description": "URL to issuing agency website",
                },
                "issuingAgencyGrantNumber": {
                    "name": "Issuing Agency Grant Number",
                    "fieldType": CustomFieldType.STRING,
                    "value": str(source.get("issuingAgencyGrantNumber", "")),
                    "description": "Agency's internal grant number",
                },
                "shortDescription": {
                    "name": "Short Description",
                    "fieldType": CustomFieldType.STRING,
                    "value": source.get("shortDescription"),
                    "description": "Short description of the grant",
                },
            },
            "createdAt": self.parse_date(source.get("last_modified")),
            "lastModifiedAt": self.parse_date(source.get("last_modified")),
        }

    def parse_url(self, link_to_apply: str | None) -> str | None:
        """
        Get a valid source URL or None if not available.

        Args:
            link_to_apply: The linkToApply value from the source data

        Returns:
            A valid URL string or None

        """
        if not link_to_apply or not link_to_apply.startswith(("http://", "https://")):
            return None

        try:
            validated_url = AnyUrl(link_to_apply)
            return str(validated_url)
        except ValidationError:
            return None

    def parse_date(self, date_str: str | None) -> datetime:
        """
        Parse a date string to a datetime object.

        Args:
            date_str: The date string to parse (must be valid ISO format) or None

        Returns:
            A datetime object

        Raises:
            ValueError: If the date string is not a valid ISO format

        """
        if date_str is None or date_str.strip() == "":
            # Return a far future date for None values or empty strings
            return datetime(2099, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

        # Parse ISO format dates
        try:
            # Handle timezone offset
            if date_str.endswith("-00:00"):
                date_str = date_str.replace("-00:00", "Z")
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError as e:
            error_msg = f"Invalid ISO date format: {date_str}"
            raise ValueError(error_msg) from e

    def transform_money(self, value: str) -> str:
        """Strip non-digit characters from monetary strings."""
        return re.sub(r"[^\d]", "", value) or "0"

    def transform_status(self, value: str) -> OppStatusOptions:
        """Transform PA opportunity status value to CommonGrants format."""
        match value.lower():
            case "accepting applications":
                return OppStatusOptions.OPEN
            case "closed":
                return OppStatusOptions.CLOSED
            case "forecasted":
                return OppStatusOptions.FORECASTED
        return OppStatusOptions.CUSTOM
