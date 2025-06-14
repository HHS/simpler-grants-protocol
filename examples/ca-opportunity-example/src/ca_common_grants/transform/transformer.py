"""
Transformer module for converting CA Grants Portal data to CommonGrants Protocol format.

This module provides functionality to transform grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

import json
from pathlib import Path
from typing import Any

from common_grants_sdk.utils.transformation import transform_from_mapping

from .mapping import CA_GRANTS_MAPPING


class CATransformer:
    """Transformer for California Grants Portal data to CommonGrants Protocol format."""

    def __init__(self):
        """Initialize the transformer with the CA Grants mapping."""
        self.mapping = CA_GRANTS_MAPPING

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
            transformed_opportunities = []
            for grant in grants:
                transformed_data = transform_from_mapping(grant, self.mapping)
                transformed_opportunities.append(transformed_data)
        except Exception as e:
            error_msg = f"Error transforming data: {e!s}"
            raise ValueError(error_msg) from e
        else:
            return transformed_opportunities

    @classmethod
    def from_file(cls, source_file: str | Path) -> list[dict[str, Any]]:
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
