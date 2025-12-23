"""Generate dummy data from JSON Schema YAML templates and output as JSON"""

import yaml
import json
import sys

from jsf import JSF  # type: ignore


# from common_grants_sdk.schemas.pydantic.generated import Address

# Hardcoded directory containing YAML schema files
YAML_DIRECTORY = "../../../../../../website/public/schemas/yaml/"


def generate_dummy_data_from_yaml(input_file, output_file=None):
    """Load YAML schema, generate dummy data using jsf, and output as JSON"""
    try:
        # Load the YAML file and convert to JSON Schema
        with open(input_file, "r") as f:
            yaml_content = f.read()

        # Convert YAML to JSON Schema format
        schema_dict = yaml.safe_load(yaml_content)
        json_schema = json.dumps(schema_dict)

        # Generate dummy data using JSF (JSON Schema Faker)
        faker = JSF(json.loads(json_schema))
        dummy_data = faker.generate()

        # Convert to JSON
        json_output = json.dumps(dummy_data, indent=2)
        print(json_output)
        # test = Address.Model.from_json(json_output)

        # print(f"test is {isinstance(test, Address.Model)}")

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


# Old main block for reference:
# if __name__ == "__main__":
#     yaml_dir = Path(YAML_DIRECTORY)

#     if not yaml_dir.exists():
#         print(f"Error: Directory '{YAML_DIRECTORY}' not found", file=sys.stderr)
#         sys.exit(1)

#     # Find all YAML files in the directory
#     yaml_files = list(yaml_dir.glob("*.yaml")) + list(yaml_dir.glob("*.yml"))

#     if not yaml_files:
#         print(f"No YAML files found in {YAML_DIRECTORY}", file=sys.stderr)
#         sys.exit(1)

#     for yaml_file in yaml_files:
#         with open(yaml_file, 'r') as f:
#             yaml_content = f.read()

#             # Convert YAML to JSON Schema format
#         schema_dict = yaml.safe_load(yaml_content)
#         json_schema = json.dumps(schema_dict)

#         # Generate dummy data using JSF (JSON Schema Faker)
#         faker = JSF(json.loads(json_schema))
#         dummy_data = faker.generate()

#         # Convert to JSON
#         json_output = json.dumps(dummy_data, indent=2)

#         print(json_output)
