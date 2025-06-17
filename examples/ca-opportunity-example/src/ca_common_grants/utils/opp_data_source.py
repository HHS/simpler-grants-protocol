"""Mock data source snapshot of CA Grants Portal data."""

import json
from pathlib import Path
from typing import Any


class OpportunityDataSource:
    """Mock data source of CA Grants Portal data."""

    # Path to the data file relative to this module
    DATA_FILE = (
        Path(__file__).parent.parent
        / "data"
        / "111c8c88-21f6-453c-ae2c-b4785a0624f5.json"
    )

    @classmethod
    def get_opportunities(cls) -> list[dict[str, Any]]:
        """
        Fetch and normalize data from local json file.

        Returns:
            List of normalized opportunity dictionaries

        Raises:
            ValueError: If file cannot be read or contains invalid JSON

        """
        opportunities = []

        try:
            # Read source data
            source_data = json.loads(cls.DATA_FILE.read_text())

            # Get column definitions
            fields = source_data.get("fields", [])
            field_names = [field["id"] for field in fields]

            # Get the records
            records = source_data.get("records", [])

            # Convert records to dictionaries using field names as keys
            for record in records:
                opportunity_dict = dict(zip(field_names, record))
                opportunities.append(opportunity_dict)

        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        except Exception as e:
            error_msg = f"Error processing file {cls.DATA_FILE}: {e!s}"
            raise ValueError(error_msg) from e

        return opportunities
