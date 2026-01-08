#!/usr/bin/env python3
"""
Validates all YAML schemas by generating sample data and validating against Pydantic models.
"""

import sys
import json
import importlib
from pathlib import Path
from typing import Any
from datetime import date, datetime
from enum import Enum

from common_grants_sdk.schemas.pydantic.validators.resolver import (
    generate_sample_from_yaml_schema,
)


def json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def get_pydantic_model_class(schema_name: str) -> Any:
    """
    Dynamically import the Pydantic model for a given schema name.

    Args:
        schema_name: Name of the schema (without .yaml extension)

    Returns:
        The Model class from the generated Pydantic module
    """
    module_path = f"common_grants_sdk.schemas.pydantic.generated.{schema_name}"
    try:
        module = importlib.import_module(module_path)
        return module.Model
    except (ImportError, AttributeError) as e:
        raise ImportError(f"Could not import Model from {module_path}: {e}")


def validate_schema(yaml_file: Path) -> tuple[str, bool, str]:
    """
    Validate a single schema by generating sample data and validating against Pydantic model.

    Args:
        yaml_file: Path to the YAML schema file

    Returns:
        Tuple of (schema_name, success, error_message)
    """
    schema_name = yaml_file.stem

    try:
        # Generate sample data from YAML schema
        sample_data = generate_sample_from_yaml_schema(yaml_file)

        # Get the corresponding Pydantic model
        ModelClass = get_pydantic_model_class(schema_name)

        # Check if ModelClass is an Enum or a Pydantic model
        if isinstance(ModelClass, type) and issubclass(ModelClass, Enum):
            # For enum schemas (primitive types), validate directly
            _model_instance = ModelClass(sample_data)
        else:
            # For Pydantic models, use model_validate_json
            # This allows Pydantic to properly convert strings to enums even in strict mode
            json_str = json.dumps(sample_data, default=json_serializer)
            _model_instance = ModelClass.model_validate_json(json_str)

        return (schema_name, True, "")

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        return (schema_name, False, error_msg)


def main():
    """
    Main function to validate all schemas.
    """
    # Define paths
    yaml_schemas_dir = (
        Path(__file__).parent / "../../../../../../website/public/schemas/yaml/"
    )

    if not yaml_schemas_dir.exists():
        print(f"Error: YAML schemas directory not found: {yaml_schemas_dir}")
        sys.exit(1)

    # Get all YAML files
    yaml_files = sorted(yaml_schemas_dir.glob("*.yaml"))

    if not yaml_files:
        print(f"No YAML files found in {yaml_schemas_dir}")
        sys.exit(1)

    print(f"Found {len(yaml_files)} schema files to validate\n")
    print("=" * 80)

    # Track results
    results = []
    passed = 0
    failed = 0

    # Validate each schema
    for yaml_file in yaml_files:
        schema_name, success, error_msg = validate_schema(yaml_file)
        results.append((schema_name, success, error_msg))

        if success:
            passed += 1
            print(f"✓ {schema_name}")
        else:
            failed += 1
            print(f"✗ {schema_name}")
            print(f"  Error: {error_msg}")

    # Print summary
    print("=" * 80)
    print("\nValidation Summary:")
    print(f"  Total:  {len(yaml_files)}")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")

    if failed > 0:
        print("\nFailed schemas:")
        for schema_name, success, error_msg in results:
            if not success:
                print(f"  - {schema_name}: {error_msg}")
        sys.exit(1)
    else:
        print("\n✓ All schemas validated successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
