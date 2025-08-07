"""Mock data source snapshot of PA Grants data."""

import json
import re
from pathlib import Path
from typing import Any


class OpportunityDataSource:
    """Mock data source of PA Grants data."""

    # Path to the data file relative to this module
    DATA_FILE = Path(__file__).parent.parent / "data" / "PA-grant-data.sample.txt"

    @classmethod
    def _raise_no_json_data_error(cls) -> None:
        """Raise error for missing JSON data."""
        error_msg = f"Could not find JSON data in file {cls.DATA_FILE}"
        raise ValueError(error_msg)

    @classmethod
    def get_opportunities(cls) -> list[dict[str, Any]]:
        """
        Fetch and normalize data from local data file.

        Returns:
            List of normalized opportunity dictionaries

        Raises:
            ValueError: If file cannot be read or contains invalid JSON

        """
        opportunities = []

        try:
            # Read source data
            file_content = cls.DATA_FILE.read_text()

            # Extract JSON data from the file content
            json_match = re.search(r"data:\s*(\{.*\})", file_content, re.DOTALL)
            if not json_match:
                cls._raise_no_json_data_error()

            # Get the grants array from the data
            json_str = json_match.group(1)  # type: ignore[union-attr]
            source_data = json.loads(json_str)
            opportunities = source_data.get("grants", [])

        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        except Exception as e:
            error_msg = f"Error processing file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        return opportunities
