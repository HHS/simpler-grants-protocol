"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import json
import re
from enum import Enum

from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.schemas.models import OppStatusOptions


class DateFormat(Enum):
    """Enum for date format types."""

    FULL_DATETIME = "9999-12-31 23:59:59"
    DATE = "12/31/99"


class OpportunityTransformer:
    """Transformer for California Grants Portal data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the CA Grants mapping."""

    @classmethod
    def transform_opportunities_file(
        cls,
        source_file: str | Path,
    ) -> list[dict[str, Any]]:
        """
        Create a transformer and transform data from a source file.

        Args:
            source_file: Path to the source JSON file containing CA Grants Portal data

        Returns:
            List of transformed opportunities in CommonGrants Protocol format

        Raises:
            ValueError: If file cannot be read or contains invalid JSON

        """
        try:
            # Read the source data
            source_path = Path(source_file)
            source_data = json.loads(source_path.read_text())

            # Create transformer and transform data
            transformer = cls()
            return transformer.transform_opportunities(source_data)

        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in file {source_file}: {e!s}"
            raise ValueError(error_msg) from e
        except Exception as e:
            error_msg = f"Error processing file {source_file}: {e!s}"
            raise ValueError(error_msg) from e

    def transform_opportunities(
        self,
        source_data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Transform list of CA opportunities to CommonGrants format.

        Args:
            source_data: CA Grants Portal opportunity data

        Returns:
            List of opportunities in CommonGrants format

        Raises:
            ValueError: If transformation fails or source data is malformed

        """
        try:
            # Transform each grant opportunity
            grants = source_data.get("grants", [])
            result = [self.transform_opportunity(o) for o in grants]

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
                        str(source.get("OpenDate")), DateFormat.DATE
                    ).date(),
                    "description": "Applications accepted beginning this date",
                },
                "appDeadline": {
                    "name": "Application Deadline",
                    "date": self.transform_date(
                        str(source.get("ApplicationDeadline")), DateFormat.DATE
                    ).date(),
                    "description": "Final deadline for all submissions",
                },
                "otherDates": {
                    "expAwardDate": {
                        "name": "Expected Award Date",
                        "date": self.transform_date(
                            str(source.get("ExpAwardDate")), DateFormat.DATE
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
                str(source.get("LastUpdated")), DateFormat.FULL_DATETIME
            ),
            "lastModifiedAt": self.transform_date(
                str(source.get("LastUpdated")), DateFormat.FULL_DATETIME
            ),
        }

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

    def transform_money(self, value: str) -> str:
        return re.sub(r"[^\d]", "", value)

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
            raise ValueError("Unrecognized date format: None")

        if value == "Ongoing":
            # For Ongoing case, use far future date and format according to enum
            far_future_date = "12/31/2099"  # Using 4-digit year
            if output_format == DateFormat.FULL_DATETIME:
                return datetime.strptime(
                    far_future_date + " 23:59:59", "%m/%d/%Y %H:%M:%S"
                )
            return datetime.strptime(far_future_date, "%m/%d/%Y")

        # Try ISO format first (2025-06-10 07:00:00)
        try:
            dt = datetime.fromisoformat(value)
            if output_format == DateFormat.DATE:
                return datetime.strptime(dt.strftime("%m/%d/%Y"), "%m/%d/%Y")
            return dt
        except ValueError:
            pass

        # Try MM/DD/YY format (12/31/25)
        try:
            dt = datetime.strptime(value, "%m/%d/%y")
            if output_format == DateFormat.FULL_DATETIME:
                return datetime.strptime(
                    dt.strftime("%m/%d/%Y") + " 23:59:59", "%m/%d/%Y %H:%M:%S"
                )
            return dt
        except ValueError:
            pass

        raise ValueError(f"Unrecognized date format: {value}")
