"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.utils.transformation import transform_from_mapping


class OpportunityMapTransformer:
    """Transformer for California Grants Portal data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the CA Grants mapping."""
        self.mapping = CA_GRANTS_MAPPING

    def post_process_opportunity(
        self,
        source_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Post-process transformed opportunity data."""
        # Set uuid
        source_data["id"] = uuid4()

        # TO DO: convert date fields (why doesn't sdk utility do this?) to
        # resolve runtime error "Expected datetime objects but received..."

        # TO DO: convert monetary fields (why doesn't sdk utility do this?) to
        # resolve runtime error "Expected decimal number but received...'

        # TO DO: convert status field (why doesn't sdk utility do this?) to
        # resolve runtime error "Expected decimal number but received...'

        return source_data

    def transform_opportunities(
        self,
        source_data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Transform source data to CommonGrants Protocol format.

        Args:
            source_data: Dictionary containing the source data with a 'grants' key

        Returns:
            List of transformed opportunities in CommonGrants Protocol format

        Raises:
            ValueError: If transformation fails or source data is malformed

        """
        try:
            # Get the grants array from the source data
            grants = source_data.get("grants", [])

            # Transform each grant opportunity
            result = []
            for opportunity in grants:
                transformed = transform_from_mapping(opportunity, self.mapping)
                processed = self.post_process_opportunity(transformed)
                result.append(processed)

        except Exception as e:
            error_msg = f"Error transforming data: {e!s}"
            raise ValueError(error_msg) from e

        else:
            return result

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


CA_GRANTS_MAPPING = {
    "title": {"field": "Title"},
    "status": {
        "switch": {
            "field": "Status",
            "case": {"active": "open", "forecasted": "forecasted", "closed": "closed"},
            "default": "custom",
        },
    },
    "description": {"field": "Description"},
    "funding": {
        "totalAmountAvailable": {
            "amount": {"field": "EstAvailFunds"},
            "currency": "USD",
        },
        "minAwardAmount": {"amount": {"field": "EstAmounts"}, "currency": "USD"},
        "maxAwardAmount": {"amount": {"field": "EstAmounts"}, "currency": "USD"},
    },
    "keyDates": {
        "appOpens": {"field": "OpenDate"},
        "appDeadline": {"field": "ApplicationDeadline"},
        "otherDates": {
            "expAwardDate": {
                "name": "expAwardDate",
                "date": {"field": "ExpAwardDate"},
                "description": "Expected award date",
            },
        },
    },
    "source": {"field": "GrantURL"},
    "customFields": {
        "portalID": {
            "name": "portalID",
            "type": CustomFieldType.STRING,
            "value": {"field": "PortalID"},
            "description": "CA Portal ID",
        },
        "agencyDept": {
            "name": "agencyDept",
            "type": CustomFieldType.STRING,
            "value": {"field": "AgencyDept"},
            "description": "Agency department",
        },
        "categories": {
            "name": "categories",
            "type": CustomFieldType.STRING,
            "value": {"field": "Categories"},
            "description": "Categories",
        },
        "categorySuggestion": {
            "name": "categorySuggestion",
            "type": CustomFieldType.STRING,
            "value": {"field": "CategorySuggestion"},
            "description": "Category suggestion",
        },
        "purpose": {
            "name": "purpose",
            "type": CustomFieldType.STRING,
            "value": {"field": "Purpose"},
            "description": "purpose",
        },
        "agencyURL": {
            "name": "agencyURL",
            "type": CustomFieldType.STRING,
            "value": {"field": "AgencyURL"},
            "description": "agencyURL",
        },
        "applicantType": {
            "name": "applicantType",
            "type": CustomFieldType.STRING,
            "value": {"field": "ApplicantType"},
            "description": "applicantType",
        },
        "applicantTypeNotes": {
            "name": "applicantTypeNotes",
            "type": CustomFieldType.STRING,
            "value": {"field": "ApplicantTypeNotes"},
            "description": "applicantTypeNotes",
        },
        "geography": {
            "name": "geography",
            "type": CustomFieldType.STRING,
            "value": {"field": "Geography"},
            "description": "geography",
        },
    },
    "lastModifiedAt": {"field": "LastUpdated"},
    "createdAt": {"field": "LastUpdated"},
}
