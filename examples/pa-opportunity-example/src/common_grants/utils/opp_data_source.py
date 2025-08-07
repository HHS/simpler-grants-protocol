"""Mock data source snapshot of PA Grants data."""

import json
from pathlib import Path
from typing import Any


class OpportunityDataSource:
    """Mock data source of PA Grants data."""

    # Path to the data file relative to this module
    DATA_FILE = Path(__file__).parent.parent / "data" / "PA-grant-data.sample.json"

    @classmethod
    def _raise_no_json_data_error(cls) -> None:
        """Raise error for missing JSON data."""
        error_msg = f"Could not find JSON data in file {cls.DATA_FILE}"
        raise ValueError(error_msg)

    @classmethod
    def get_opportunities(cls) -> list[dict[str, Any]]:
        """
        Fetch and normalize data from local JSON data file.

        Returns:
            List of normalized opportunity dictionaries

        Raises:
            ValueError: If file cannot be read or contains invalid JSON

        """
        opportunities = []

        try:
            # Read and parse JSON data directly
            with cls.DATA_FILE.open() as file:
                source_data = json.load(file)

            # Get the grants array from the data
            opportunities = source_data.get("grants", [])

        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        except Exception as e:
            error_msg = f"Error processing file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        return opportunities
