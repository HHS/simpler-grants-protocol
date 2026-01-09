"""Generate dummy data from JSON Schema YAML templates and output as JSON."""

import json
import sys
from datetime import date, datetime
from pathlib import Path

from common_grants_sdk.schemas.pydantic.validators.resolver import (
    generate_sample_from_yaml_schema,
)


def json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default JSON code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def generate_dummy_data_from_yaml(input_file):
    """Load YAML schema, generate dummy data using resolver, and output as JSON

    Args: YAML file to generate dummy data from

    Returns: A boolean regarding the status of the JSON generation
    """
    try:
        # Convert to Path object
        schema_path = Path(input_file)

        # Generate sample data using resolver (handles $ref resolution)
        dummy_data = generate_sample_from_yaml_schema(schema_path)

        # Convert to JSON and output
        json_output = json.dumps(dummy_data, indent=2, default=json_serializer)
        print(json_output)

    except Exception as e:
        print(f"Error generating dummy data from {input_file}: {e}", file=sys.stderr)
        return False

    return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        generate_dummy_data_from_yaml(input_file)
    else:
        print("Usage: python validate.py <path_to_yaml_file>", file=sys.stderr)
        sys.exit(1)
