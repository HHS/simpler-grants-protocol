"""
Resolves a JSONSchema YAML file to either randomized data or to a predefined json object in the repository
"""

import yaml
import jsonref  # type: ignore[import-untyped]
import sys
import re
from pathlib import Path
from typing import Any
from hypothesis import strategies as st
from hypothesis_jsonschema import from_schema


# Custom YAML loader that keeps dates as strings instead of date objects
class NoDatesSafeLoader(yaml.SafeLoader):
    """YAML loader that doesn't convert date strings to date objects"""

    pass


# Remove the timestamp constructor to prevent date conversion
NoDatesSafeLoader.yaml_implicit_resolvers = {
    k: [r for r in v if r[0] != "tag:yaml.org,2002:timestamp"]
    for k, v in NoDatesSafeLoader.yaml_implicit_resolvers.items()
}


def fix_datetime_strings(data):
    """
    Recursively fix datetime strings that are missing timezone information.
    Adds 'Z' (UTC) suffix to datetime strings that match ISO format but lack timezone.

    Args: a JSON object that is generated from JSONSchema YAML

    Returns: The input JSON object with the datetime strings fixed so they can be loaded
    """
    # Pattern for datetime without timezone: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM:SS.ffffff
    datetime_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$")

    if isinstance(data, dict):
        return {k: fix_datetime_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [fix_datetime_strings(item) for item in data]
    elif isinstance(data, str):
        # If it matches datetime pattern without timezone, add 'Z'
        if datetime_pattern.match(data):
            return data + "Z"
        return data
    else:
        return data


def generate_sample_from_yaml_schema(schema_file: Path) -> Any:
    """
    Load a YAML JSON Schema with $ref resolution and generate sample data

    Args: A file path to generate JSON from

    Returns: Sample JSON
    """
    # Check for custom example data first
    custom_examples_dir = Path(__file__).parent / "custom_examples"
    custom_example_file = custom_examples_dir / f"{schema_file.stem}.json"

    if custom_example_file.exists():
        import json

        with open(custom_example_file, "r") as f:
            return json.load(f)

    # Custom loader for YAML files
    def yaml_loader(uri):
        if uri.startswith("file://"):
            path = Path(uri[7:])
        else:
            path = (schema_file.parent / uri).resolve()

        with open(path, "r") as f:
            return yaml.load(f, Loader=NoDatesSafeLoader)

    # Load and resolve schema
    with open(schema_file, "r") as f:
        schema = yaml.load(f, Loader=NoDatesSafeLoader)

    base_uri = schema_file.as_uri()

    # Try to generate data with hypothesis
    try:
        resolved_schema = jsonref.JsonRef.replace_refs(
            schema, base_uri=base_uri, loader=yaml_loader, jsonschema=True
        )

        # Define custom format handlers for hypothesis
        custom_formats = {
            "uuid": st.uuids().map(str),  # Generate valid UUIDs as strings
            "email": st.emails(),  # Generate valid email addresses
            "date-time": st.datetimes(timezones=st.timezones()).map(
                lambda dt: dt.isoformat()
            ),  # Generate timezone-aware datetime strings
        }

        # Generate sample data using hypothesis with custom formats
        strategy = from_schema(resolved_schema, custom_formats=custom_formats)
        return strategy.example()
    except ValueError as e:
        # If circular reference is detected, fall back to using examples from schema
        if "Circular reference detected" in str(e):
            if "examples" in schema and schema["examples"]:
                # Return the first example, fixing any datetime strings
                return fix_datetime_strings(schema["examples"][0])
            # Check if schema uses allOf and try to get examples from referenced schemas
            elif "allOf" in schema:
                for ref_schema in schema["allOf"]:
                    if "$ref" in ref_schema:
                        # Try to load and get examples from the referenced schema
                        ref_path = schema_file.parent / ref_schema["$ref"]
                        if ref_path.exists():
                            with open(ref_path, "r") as f:
                                ref_data = yaml.load(f, Loader=NoDatesSafeLoader)
                            if "examples" in ref_data and ref_data["examples"]:
                                # Merge with properties from current schema if any
                                base_example = fix_datetime_strings(
                                    ref_data["examples"][0]
                                )
                                # Add any additional properties from current schema
                                if "properties" in schema:
                                    for prop_name in schema["properties"]:
                                        if prop_name not in base_example:
                                            # Try to add empty/default values for additional properties
                                            prop_schema = schema["properties"][
                                                prop_name
                                            ]
                                            if prop_schema.get("type") == "array":
                                                base_example[prop_name] = []
                                return base_example
                # If we couldn't find examples in allOf refs, return empty object
                return {}
            else:
                # If no examples, create a minimal valid object
                if schema.get("type") == "object":
                    return {}
                elif schema.get("type") == "array":
                    return []
                else:
                    raise ValueError(
                        f"No examples found for circular schema: {schema_file.name}"
                    )
        else:
            # Re-raise other ValueError exceptions
            raise


# Usage
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python resolver.py <path_to_yaml_schema>")
        sys.exit(1)

    schema_path = Path(sys.argv[1])
    sample = generate_sample_from_yaml_schema(schema_path)
    print(sample)
