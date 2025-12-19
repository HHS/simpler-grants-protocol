echo "Processing all schemas"
poetry run datamodel-codegen --input ../../website/public/schemas/yaml \
 --output common_grants_sdk/schemas/pydantic/generated \
 --base-class common_grants_sdk.schemas.pydantic.base.CommonGrantsBaseModel \
 --reuse-model --reuse-scope tree \
 --field-constraints --use-standard-collections \
 --capitalise-enum-members \
 --use-specialized-enum \
 --target-python-version 3.13\
 --all-exports-scope recursive\
 --all-exports-collision-strategy minimal-prefix \
 --snake-case-field \
 --field-include-all-keys \
 --use-default-kwarg \