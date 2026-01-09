#!/bin/bash

# Add titles to YAML schemas
SCRIPT_DIR="$(dirname "$0")"
"$SCRIPT_DIR/add_title.sh" ../../../../../website/public/schemas/yaml

echo "Processing all schemas"
poetry run datamodel-codegen --input ../../../../../website/public/schemas/yaml \
 --output ../pydantic/generated \
 --output-model-type pydantic_v2.BaseModel \
 --base-class common_grants_sdk.schemas.pydantic.base.CommonGrantsBaseModel \
 --reuse-model \
 --field-constraints --use-standard-collections \
 --capitalise-enum-members \
 --use-specialized-enum \
 --target-python-version 3.13\
 --snake-case-field \
 --field-include-all-keys \
 --use-default-kwarg \
