#!/bin/bash
#Script to run the end to end process for auto-generating pydantic schemas
#Usage: generate_models.sh # <PATH TO JSONSCHEMA YAML> <OUTPUT DIR TO PLACE THE PYDANTIC OBJECTS IN 

# Input Variables
YAML_DIR="$1"
OUTPUT_DIR="$2"


"./rename_and_add_title.sh" $YAML_DIR $OUTPUT_DIR

echo "Processing all schemas"
poetry run datamodel-codegen --input "${OUTPUT_DIR}/schemas" \
 --output "${OUTPUT_DIR}/pydantic" \
 --output-model-type pydantic_v2.BaseModel \
 --base-class common_grants_sdk.schemas.pydantic.base.CommonGrantsBaseModel \
 --reuse-model \
 --field-constraints \
 --use-standard-collections \
 --capitalise-enum-members \
 --use-specialized-enum \
 --target-python-version 3.13\
 --snake-case-field \
 --field-include-all-keys \
 --use-default-kwarg \
