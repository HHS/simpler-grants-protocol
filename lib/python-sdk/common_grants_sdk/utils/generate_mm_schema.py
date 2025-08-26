#!/usr/bin/env python3
"""Script to generate marshmallow models from PySDK pydantic models."""

import importlib
import inspect
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union


from pydantic import BaseModel
from common_grants_sdk.schemas import *  # noqa: F403
from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.filters import *  # noqa: F403
from common_grants_sdk.schemas.models import *  # noqa: F403
from common_grants_sdk.schemas.requests import *  # noqa: F403
from common_grants_sdk.schemas.responses import *  # noqa: F403


class PydanticToMarshmallowConverter:
    """Convert Pydantic models to Marshmallow schemas."""

    # Mapping of Pydantic types to Marshmallow field types
    TYPE_MAPPING = {
        "str": "String",
        "int": "Integer",
        "float": "Decimal",
        "bool": "Boolean",
        "UUID": "UUID",
        "datetime": "DateTime",
        "date": "Date",
        "dict": "Dict",
        "list": "List",
        "List": "List",
        "Optional": "Optional",
        "Union": "Union",
        "Any": "Raw",
        "HttpUrl": "String",
        "EmailStr": "String",
        "AnyUrl": "String",
    }

    # Mapping of Pydantic field types to Marshmallow field types
    FIELD_TYPE_MAPPING = {
        "HttpUrl": "String",
        "EmailStr": "String",
        "AnyUrl": "String",
    }

    # Types that should not generate placeholder schemas
    SKIP_PLACEHOLDER_TYPES = {
        "UUID",
        "HttpUrl",
        "EmailStr",
        "AnyUrl",
        "datetime",
        "date",
        "ArrayOperator",
        "StringOperator",
        "RangeOperator",
        "ComparisonOperator",
        "EquivalenceOperator",
        "DateRangeEvent",
        "SingleDateEvent",
        "OtherEvent",
        "OppStatusOptions",
        "OppSortBy",
        "UnionType",
        "CustomFieldType",
    }

    def __init__(self):
        self.generated_schemas: Set[str] = set()
        self.schema_dependencies: Dict[str, Set[str]] = {}
        self.enum_definitions: Dict[str, str] = {}

    def convert_pydantic_model(self, model_class: type) -> Tuple[str, Set[str]]:
        """Convert a Pydantic model to a Marshmallow schema."""
        if not (
            issubclass(model_class, CommonGrantsBaseModel)
            or issubclass(model_class, BaseModel)
        ):
            return "", set()

        class_name = model_class.__name__
        if class_name in self.generated_schemas:
            return "", set()

        self.generated_schemas.add(class_name)
        dependencies = set()

        # Get model fields
        fields = (
            model_class.model_fields if hasattr(model_class, "model_fields") else {}
        )

        schema_lines = []
        schema_lines.append(f"class {class_name}Schema(Schema):")

        for field_name, field_info in fields.items():
            field_type = self._get_field_type(field_info)
            marshmallow_field = self._convert_field_type(field_type, field_info)

            # Handle field metadata
            metadata = self._extract_field_metadata(field_info)

            # Handle required fields
            is_required = (
                not field_info.is_required()
                if hasattr(field_info, "is_required")
                else True
            )

            # Build field definition
            field_def = f"    {field_name} = {marshmallow_field}"

            # Check if this is a nested field (needs comma)
            is_nested = (
                marshmallow_field.startswith("fields.Nested(")
                or "fields.Nested(" in marshmallow_field
            )

            # Check if this is a list field (already has closing parenthesis)
            is_list_field = marshmallow_field.startswith(
                "fields.List("
            ) and marshmallow_field.endswith(")")

            # Add metadata if present
            if metadata:
                if is_list_field:
                    # For fields.List(...), we need to add metadata before the closing parenthesis
                    field_def = field_def[:-1] + f", {metadata})"
                elif is_nested:
                    # For nested fields, add metadata before the closing parenthesis
                    field_def = field_def[:-1] + f", {metadata})"
                else:
                    field_def += f"({metadata})"
            elif not is_required:
                if is_list_field:
                    # For fields.List(...), we need to add metadata before the closing parenthesis
                    field_def = field_def[:-1] + ", allow_none=True)"
                elif is_nested:
                    # For nested fields, add allow_none before the closing parenthesis
                    field_def = field_def[:-1] + ", allow_none=True)"
                else:
                    field_def += "(allow_none=True)"
            else:
                if is_list_field:
                    # List field already has closing parenthesis, do nothing
                    pass
                elif is_nested:
                    # Nested field already has closing parenthesis, do nothing
                    pass
                else:
                    field_def += "()"

            schema_lines.append(field_def)

            # Track dependencies (skip generic type parameters)
            if (
                field_type not in self.TYPE_MAPPING
                and not field_type.endswith("T")
                and field_type not in self.SKIP_PLACEHOLDER_TYPES
            ):
                # Extract dependencies from complex types
                if field_type.startswith("List["):
                    inner_type = field_type[5:-1]  # Remove 'List[' and ']'
                    if (
                        inner_type not in self.TYPE_MAPPING
                        and not inner_type.endswith("T")
                        and inner_type not in self.SKIP_PLACEHOLDER_TYPES
                    ):
                        # Clean the inner type name to handle dotted names
                        clean_inner_type = self._clean_type_name(inner_type)
                        if clean_inner_type not in self.SKIP_PLACEHOLDER_TYPES:
                            dependencies.add(clean_inner_type)
                elif field_type.startswith("Optional["):
                    inner_type = field_type[9:-1]  # Remove 'Optional[' and ']'
                    if (
                        inner_type not in self.TYPE_MAPPING
                        and not inner_type.endswith("T")
                        and inner_type not in self.SKIP_PLACEHOLDER_TYPES
                    ):
                        # Clean the inner type name to handle dotted names
                        clean_inner_type = self._clean_type_name(inner_type)
                        if clean_inner_type not in self.SKIP_PLACEHOLDER_TYPES:
                            dependencies.add(clean_inner_type)
                elif field_type.startswith("Union[") or field_type.startswith(
                    "typing.Union["
                ):
                    # For Union types, extract all non-None types
                    union_content = field_type[
                        field_type.find("[") + 1 : field_type.rfind("]")
                    ]
                    for union_type in union_content.split(","):
                        union_type = union_type.strip()
                        if (
                            union_type != "None"
                            and union_type not in self.TYPE_MAPPING
                            and not union_type.endswith("T")
                            and union_type not in self.SKIP_PLACEHOLDER_TYPES
                        ):
                            # Clean the union type name to handle dotted names
                            clean_union_type = self._clean_type_name(union_type)
                            if clean_union_type not in self.SKIP_PLACEHOLDER_TYPES:
                                dependencies.add(clean_union_type)
                else:
                    # Clean the field type name to handle dotted names
                    clean_field_type = self._clean_type_name(field_type)
                    if clean_field_type not in self.SKIP_PLACEHOLDER_TYPES:
                        dependencies.add(clean_field_type)

        schema_lines.append("")
        result = "\n".join(schema_lines)
        return result, dependencies

    def _get_field_type(self, field_info: Any) -> str:
        """Extract the field type from a Pydantic field."""
        annotation = field_info.annotation

        if hasattr(annotation, "__origin__"):
            # Handle generic types like Optional, Union, List
            origin = annotation.__origin__
            args = annotation.__args__

            if origin is Optional or (
                hasattr(annotation, "__origin__")
                and annotation.__origin__ is Union
                and type(None) in args
            ):
                # Handle Optional types
                non_none_args = [arg for arg in args if arg is not type(None)]
                if len(non_none_args) == 1:
                    return self._get_simple_type(non_none_args[0])
                else:
                    return f"Union[{', '.join(self._get_simple_type(arg) for arg in non_none_args)}]"
            elif origin is list:
                # Handle List types
                if args:
                    inner_type = self._get_simple_type(args[0])
                    # If the inner type is a Union, get the full annotation
                    if hasattr(args[0], "__origin__") and args[0].__origin__ is Union:
                        inner_type = str(args[0])
                    return f"List[{inner_type}]"
                else:
                    return "List"
            elif origin is dict:
                # Handle Dict types
                return "Dict"
            else:
                # For other generic types, return the full annotation as string
                return str(annotation)
        else:
            return self._get_simple_type(annotation)

    def _get_simple_type(self, type_obj: Any) -> str:
        """Get the simple type name."""
        if hasattr(type_obj, "__name__"):
            return type_obj.__name__
        elif hasattr(type_obj, "__class__"):
            return type_obj.__class__.__name__
        else:
            return str(type_obj)

    def _convert_field_type(self, field_type: str, field_info: Any) -> str:
        """Convert a field type to a Marshmallow field."""
        # Handle special cases
        if field_type in self.FIELD_TYPE_MAPPING:
            return f"fields.{self.FIELD_TYPE_MAPPING[field_type]}"

        # Handle basic types
        if field_type in self.TYPE_MAPPING:
            if field_type in ["list", "List"]:
                # For generic list types, we need to specify what type of items
                return "fields.List(fields.Raw)"
            else:
                return f"fields.{self.TYPE_MAPPING[field_type]}"

        # Handle List types
        if field_type.startswith("List["):
            inner_type = field_type[5:-1]  # Remove 'List[' and ']'
            if inner_type in self.TYPE_MAPPING:
                return f"fields.List(fields.{self.TYPE_MAPPING[inner_type]})"
            elif inner_type.startswith("Union[") or inner_type.startswith(
                "typing.Union["
            ):
                # Handle Union types inside Lists - convert to Raw
                return "fields.List(fields.Raw)"
            else:
                # Clean up the inner type name
                clean_inner_type = self._clean_type_name(inner_type)
                # Check if this is a generic type parameter
                if clean_inner_type.endswith("T"):
                    return "fields.List(fields.Raw)"
                else:
                    return f"fields.List(fields.Nested({clean_inner_type}Schema))"
        elif field_type == "List" or field_type == "list":
            # Handle generic List type (no inner type specified)
            return "fields.List(fields.Raw)"

        # Handle Optional types
        if field_type.startswith("Optional["):
            inner_type = field_type[9:-1]  # Remove 'Optional[' and ']'
            return self._convert_field_type(inner_type, field_info)

        # Handle Union types
        if field_type.startswith("Union[") or field_type.startswith("typing.Union["):
            # For now, treat as Raw field
            return "fields.Raw"

        # Handle complex type names with dots
        if "." in field_type:
            # Extract just the class name
            class_name = field_type.split(".")[-1]
            # Check if this is a generic type parameter
            if class_name.endswith("T"):
                return "fields.Raw"
            else:
                return f"fields.Nested({class_name}Schema)"

        # Handle custom types - assume they're nested schemas
        clean_type = self._clean_type_name(field_type)

        # Check if this is a generic type parameter (ends with T)
        if clean_type.endswith("T"):
            # Generic type parameters should be treated as Raw fields
            return "fields.Raw"
        else:
            return f"fields.Nested({clean_type}Schema)"

    def _clean_type_name(self, type_name: str) -> str:
        """Clean up type names to make them valid Python identifiers."""
        # Remove any brackets and their contents
        import re

        # First, remove any square brackets and their contents
        cleaned = re.sub(r"\[[^\]]*\]", "", type_name)

        # Handle dotted names by taking the last part
        if "." in cleaned:
            cleaned = cleaned.split(".")[-1]

        # Remove any remaining special characters except alphanumeric and underscore
        cleaned = re.sub(r"[^\w]", "", cleaned)
        # If the result is empty, use a fallback
        if not cleaned:
            cleaned = "UnknownType"

        return cleaned

    def _extract_field_metadata(self, field_info: Any) -> str:
        """Extract metadata from a Pydantic field."""
        metadata_parts = []

        # Get description
        if hasattr(field_info, "description") and field_info.description:
            metadata_parts.append(f'description="{field_info.description}"')

        # Get examples
        if hasattr(field_info, "json_schema_extra") and field_info.json_schema_extra:
            examples = field_info.json_schema_extra.get("examples", [])
            if examples:
                metadata_parts.append(f'example="{examples[0]}"')

        # Get alias
        if hasattr(field_info, "alias") and field_info.alias:
            metadata_parts.append(f'data_key="{field_info.alias}"')

        return ", ".join(metadata_parts)

    def find_all_models(self) -> List[type]:
        """Find all Pydantic models in the PySDK."""
        models = []

        # Import all modules to find models
        modules_to_check = [
            "common_grants_sdk.schemas",
            "common_grants_sdk.schemas.filters",
            "common_grants_sdk.schemas.models",
            "common_grants_sdk.schemas.requests",
            "common_grants_sdk.schemas.responses",
            "common_grants_sdk.schemas.pagination",
            "common_grants_sdk.schemas.types",
        ]

        for module_name in modules_to_check:
            try:
                module = importlib.import_module(module_name)
                for name, obj in inspect.getmembers(module):
                    if (
                        inspect.isclass(obj)
                        and (
                            issubclass(obj, CommonGrantsBaseModel)
                            or (
                                hasattr(obj, "__module__")
                                and "common_grants_sdk.schemas" in obj.__module__
                                and issubclass(obj, BaseModel)
                            )
                        )
                        and obj != CommonGrantsBaseModel
                        and obj != BaseModel
                    ):
                        models.append(obj)
            except ImportError as e:
                print(f"Warning: Could not import {module_name}: {e}")

        return models

    def generate_marshmallow_file(self) -> str:
        """Generate the complete marshmallow file content."""
        return self._generate_first_pass()

    def _generate_first_pass(self) -> str:
        """First pass: Generate schemas with string references."""
        models = self.find_all_models()

        # Sort schemas by dependencies
        sorted_schemas = self._sort_schemas_by_dependencies(models)

        # Reset generated_schemas set for actual generation
        self.generated_schemas.clear()

        # Generate schemas in dependency order
        schema_definitions = []
        all_dependencies = set()

        # Create a mapping of model names to model classes for lookup
        model_map = {model.__name__: model for model in models}

        for schema_name, deps in sorted_schemas:
            model = model_map.get(schema_name)
            if model:
                schema_def, model_deps = self.convert_pydantic_model(model)
                if schema_def:
                    schema_definitions.append(schema_def)
                    all_dependencies.update(model_deps)
                else:
                    pass  # Removed debug print
            else:
                pass  # Removed debug print

        # Generate enum definitions
        enum_definitions = []
        for enum_name, enum_values in self.enum_definitions.items():
            enum_definitions.append(enum_values)

        # Generate placeholder schemas for missing dependencies (skip generic type parameters)
        placeholder_schemas = []
        for dep in all_dependencies:
            # Skip generic type parameters and known types that shouldn't have placeholders
            if dep.endswith("T") or dep in self.SKIP_PLACEHOLDER_TYPES:
                continue
            # Clean the dependency name to make it a valid class name
            clean_dep = self._clean_type_name(dep)
            if not any(
                f"class {clean_dep}Schema(Schema):" in schema_def
                for schema_def in schema_definitions
            ):
                placeholder_schemas.append(
                    f"""class {clean_dep}Schema(Schema):
    # Placeholder schema for {dep}
    pass
"""
                )

        # Build the complete file
        file_content = [
            '"""Generated Marshmallow schemas for CommonGrants Protocol models."""',
            "",
            "from marshmallow import Schema, fields",
            "",
        ]

        # Add enum definitions
        if enum_definitions:
            file_content.extend(enum_definitions)
            file_content.append("")

        # Add placeholder schemas first
        if placeholder_schemas:
            file_content.extend(placeholder_schemas)
            file_content.append("")

        # Add schema definitions
        file_content.extend(schema_definitions)

        return "\n".join(file_content)

    def _sort_schemas_by_dependencies(
        self, models: List[type]
    ) -> List[Tuple[str, Set[str]]]:
        """Sort schemas by their dependencies to ensure correct definition order."""
        # Build dependency graph
        schema_deps = {}
        for model in models:
            class_name = model.__name__
            schema_def, deps = self.convert_pydantic_model(model)
            if schema_def:
                # Filter out generic type parameters and basic types
                filtered_deps = {
                    dep
                    for dep in deps
                    if not dep.endswith("T") and dep not in self.TYPE_MAPPING
                }
                schema_deps[class_name] = filtered_deps

        # Topological sort
        sorted_schemas = []
        visited = set()
        temp_visited = set()

        def visit(schema_name):
            if schema_name in temp_visited:
                # Circular dependency detected
                return
            if schema_name in visited:
                return

            temp_visited.add(schema_name)

            for dep in schema_deps.get(schema_name, set()):
                if dep in schema_deps:  # Only visit if it's a schema we're generating
                    visit(dep)

            temp_visited.remove(schema_name)
            visited.add(schema_name)
            sorted_schemas.append((schema_name, schema_deps.get(schema_name, set())))

        for schema_name in schema_deps:
            if schema_name not in visited:
                visit(schema_name)

        return sorted_schemas


def main():
    """Main function to generate marshmallow models."""
    # Check command line arguments
    if len(sys.argv) != 2:
        print("Usage: python generate_mm_schema.py <output_filename>")
        print("Example: python generate_mm_schema.py common-grants-mm-schema.py")
        sys.exit(1)

    output_filename = sys.argv[1]

    try:
        converter = PydanticToMarshmallowConverter()

        # Generate the marshmallow file content
        content = converter.generate_marshmallow_file()

        # Create output path using the provided filename
        output_path = Path(output_filename)

        # Ensure the output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write to file
        with open(output_path, "w") as f:
            f.write(content)

        print(f"Generated marshmallow schemas at: {output_path}")
        print(f"Generated {len(converter.generated_schemas)} schemas")

    except Exception as e:
        print(f"Error generating marshmallow schemas: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
