"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.schemas.models import OppStatusOptions


class DateFormat(Enum):
    """Enum for date format types."""

    LONG = "9999-12-31 23:59:59"
    SHORT = "12/31/99"


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
            "id": uuid4(),
            "title": source.get("Title"),
            "description": source.get("Description"),
            "status": {
                "value": self.transform_status(str(source.get("Status"))),
                "description": "Opportunity is actively accepting applications",
            },
            "funding": {
                "totalAmountAvailable": {
                    "amount": self.transform_money(str(source.get("EstAvailFunds"))),
                    "currency": "USD",
                },
                "minAwardAmount": {
                    "amount": self.transform_money(str(source.get("EstAmounts"))),
                    "currency": "USD",
                },
                "maxAwardAmount": {
                    "amount": self.transform_money(str(source.get("EstAmounts"))),
                    "currency": "USD",
                },
            },
            "keyDates": {
                "appOpens": {
                    "name": "Application Opens",
                    "date": self.transform_date(
                        str(source.get("OpenDate")),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Applications accepted beginning this date",
                },
                "appDeadline": {
                    "name": "Application Deadline",
                    "date": self.transform_date(
                        str(source.get("ApplicationDeadline")),
                        DateFormat.SHORT,
                    ).date(),
                    "description": "Final deadline for all submissions",
                },
                "otherDates": {
                    "expAwardDate": {
                        "name": "Expected Award Date",
                        "date": self.transform_date(
                            str(source.get("ExpAwardDate")),
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
            "createdAt": self.transform_date(
                str(source.get("LastUpdated")),
                DateFormat.LONG,
            ),
            "lastModifiedAt": self.transform_date(
                str(source.get("LastUpdated")),
                DateFormat.LONG,
            ),
        }

    def transform_date(self, value: str, output_format: DateFormat) -> datetime:
        """
        Transform a date string into a specified datetime format.

        Args:
            value: Input date string in various formats
            output_format: Desired output format from DateFormat enum

        Returns:
            datetime object in the specified format

        Raises:
            ValueError: If input format is not recognized

        """
        if value is None:
            e = "Unrecognized date format: None"
            raise ValueError(e)

        # Transform unknown dates
        unknown_dates = [
            "TBD",
            "TBA",
            "ONGOING",
            "PENDING",
            "TO BE ANNOUNCED",
            "TO BE DETERMINED",
        ]
        if value.upper() in unknown_dates:
            # For unknown date cases use far future date
            future_date = "12/31/2099"
            if output_format == DateFormat.LONG:
                future_dt = future_date + " 23:59:59"
                return datetime.strptime(future_dt, "%m/%d/%Y %H:%M:%S")  # noqa: DTZ007
            return datetime.strptime(future_date, "%m/%d/%Y")  # noqa: DTZ007

        # Transform from ISO format (2025-06-10 07:00:00)
        try:
            dt = datetime.fromisoformat(value)
            if output_format == DateFormat.SHORT:
                return datetime.strptime(  # noqa: DTZ007
                    dt.strftime("%m/%d/%Y"),
                    "%m/%d/%Y",
                )
            return dt  # noqa: TRY300
        except ValueError:
            pass

        # Transform from MM/DD/YY format (12/31/25)
        try:
            dt = datetime.strptime(value, "%m/%d/%y")  # noqa: DTZ007
            if output_format == DateFormat.LONG:
                return datetime.strptime(  # noqa: DTZ007
                    dt.strftime("%m/%d/%Y") + " 23:59:59",
                    "%m/%d/%Y %H:%M:%S",
                )
            return dt  # noqa: TRY300
        except ValueError:
            pass

        e = f"Unrecognized date format: {value}"
        raise ValueError(e)

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
