#!/usr/bin/env python3
"""Script to generate marshmallow models from PySDK pydantic models."""

import importlib
import inspect
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union, Literal
from collections import defaultdict, deque

from pydantic import BaseModel


class PydanticToMarshmallowConverter:
    """Convert Pydantic models to Marshmallow schemas with proper dependency ordering."""

    # Mapping of Pydantic types to Marshmallow field types
    TYPE_MAPPING = {
        "str": "Raw",
        "int": "Integer", 
        "float": "Decimal",
        "bool": "Boolean",
        "UUID": "UUID",
        "datetime": "Raw",
        "date": "Date",
        "time": "Time",
        "dict": "Dict",
        "list": "List",
        "List": "List",
        "Optional": "Optional",
        "Union": "Union",
        "Any": "Raw",
        "HttpUrl": "Raw",
        "EmailStr": "Raw",
        "AnyUrl": "Raw",
        "DecimalString": "Raw",
        "ISODate": "Date",
        "ISOTime": "Time",
        "UTCDateTime": "Raw",
    }

    # Types that should be treated as basic types (not nested schemas)
    BASIC_TYPES = {
        "UUID", "HttpUrl", "EmailStr", "AnyUrl", "datetime", "date",
        "DecimalString", "ISODate", "ISOTime", "UTCDateTime",
        "ArrayOperator", "StringOperator", "RangeOperator", "ComparisonOperator",
        "EquivalenceOperator", "DateRangeEvent", "SingleDateEvent", "OtherEvent",
        "OppStatusOptions", "OppSortBy", "UnionType", "CustomFieldType",
        "EventType", "SortOrder",
    }

    def __init__(self):
        self.models: Dict[str, type] = {}
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.generated_schemas: Set[str] = set()

    def find_all_models(self) -> List[type]:
        """Find all Pydantic models in the schemas package."""
        models = []
        
        # Schema modules to scan
        modules_to_check = [
            "common_grants_sdk.schemas.base",
            "common_grants_sdk.schemas.fields", 
            "common_grants_sdk.schemas.filters",
            "common_grants_sdk.schemas.models",
            "common_grants_sdk.schemas.pagination",
            "common_grants_sdk.schemas.requests",
            "common_grants_sdk.schemas.responses",
            "common_grants_sdk.schemas.sorting",
            "common_grants_sdk.schemas.types",
        ]
        
        for module_name in modules_to_check:
            try:
                module = importlib.import_module(module_name)
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, BaseModel) and
                        obj != BaseModel):
                        models.append(obj)
                        self.models[name] = obj
            except ImportError as e:
                print(f"Warning: Could not import {module_name}: {e}")

        return models

    def analyze_dependencies(self, models: List[type]) -> None:
        """Analyze dependencies between models."""
        for model in models:
            class_name = model.__name__
            self.dependencies[class_name] = set()
            
            # Get model fields
            fields = getattr(model, 'model_fields', {})
            
            for field_name, field_info in fields.items():
                field_type = self._extract_field_type(field_info)
                dependencies = self._extract_dependencies(field_type)
                self.dependencies[class_name].update(dependencies)

    def _extract_field_type(self, field_info) -> str:
        """Extract the field type from a Pydantic field."""
        if not hasattr(field_info, 'annotation') or field_info.annotation is None:
            return "Any"
        
        annotation = field_info.annotation
        
        # Handle string annotations
        if isinstance(annotation, str):
            return annotation
        
        # Handle type annotations
        if hasattr(annotation, '__origin__'):
            origin = annotation.__origin__
            args = getattr(annotation, '__args__', None)
            
            # Handle Literal types first
            if origin is Literal:
                return "str"
            
            if origin is list or origin is List:
                if args and len(args) > 0 and args[0] is not type(None):
                    return f"List[{self._get_type_name(args[0])}]"
                else:
                    return "List"
            elif origin is Union:
                # Handle Optional types (Union[T, None])
                if args:
                    non_none_args = [arg for arg in args if arg is not type(None)]
                    if len(non_none_args) == 1:
                        return f"Optional[{self._get_type_name(non_none_args[0])}]"
                    else:
                        # Filter out None values and handle them properly
                        valid_args = []
                        for arg in non_none_args:
                            if arg is not None:
                                valid_args.append(self._get_type_name(arg))
                        return f"Union[{', '.join(valid_args)}]"
                else:
                    return "Union"
            else:
                return str(annotation)
        elif hasattr(annotation, '_name') and annotation._name == "Literal":
            # Handle Literal types - convert to string
            return "str"
        elif hasattr(annotation, '__origin__') and annotation.__origin__ is Literal:
            # Handle Literal types - convert to string
            return "str"
        else:
            return self._get_type_name(annotation)

    def _get_type_name(self, type_obj) -> str:
        """Get the name of a type object."""
        if hasattr(type_obj, '__name__'):
            return type_obj.__name__
        elif hasattr(type_obj, '_name'):
            return type_obj._name
        elif hasattr(type_obj, '__origin__') and type_obj.__origin__ is Union:
            return "Union"
        else:
            return str(type_obj)

    def _is_generic_type(self, type_obj) -> bool:
        """Check if a type is a generic type."""
        # Check if it has type arguments
        if hasattr(type_obj, '__args__') and type_obj.__args__:
            return True
        
        # Check if the string representation contains square brackets
        type_str = str(type_obj)
        if '[' in type_str and ']' in type_str:
            return True
        
        return False

    def _extract_dependencies(self, field_type: str) -> Set[str]:
        """Extract dependencies from a field type."""
        dependencies = set()
        
        if field_type in self.TYPE_MAPPING or field_type in self.BASIC_TYPES:
            return dependencies
        
        # Handle complex types
        if field_type.startswith("List["):
            inner_type = field_type[5:-1]  # Remove 'List[' and ']'
            if inner_type not in self.TYPE_MAPPING and inner_type not in self.BASIC_TYPES:
                dependencies.add(self._clean_type_name(inner_type))
        elif field_type.startswith("Optional["):
            inner_type = field_type[9:-1]  # Remove 'Optional[' and ']'
            if inner_type not in self.TYPE_MAPPING and inner_type not in self.BASIC_TYPES:
                dependencies.add(self._clean_type_name(inner_type))
        elif field_type.startswith("Union[") or field_type.startswith("typing.Union["):
            # Extract all non-None types from Union
            union_content = field_type[field_type.find("[") + 1:field_type.rfind("]")]
            for union_type in union_content.split(","):
                union_type = union_type.strip()
                if (union_type != "None" and 
                    union_type not in self.TYPE_MAPPING and 
                    union_type not in self.BASIC_TYPES):
                    dependencies.add(self._clean_type_name(union_type))
        elif field_type.startswith("Literal["):
            # Literal types don't have dependencies
            return dependencies
        else:
            # Simple type reference
            dependencies.add(self._clean_type_name(field_type))
        
        return dependencies

    def _clean_type_name(self, type_name: str) -> str:
        """Clean a type name to make it a valid class name."""
        # Remove module prefixes
        if "." in type_name:
            type_name = type_name.split(".")[-1]
        
        # Remove generic type parameters
        if "[" in type_name:
            type_name = type_name.split("[")[0]
        
        return type_name

    def topological_sort(self) -> List[str]:
        """Sort models by dependencies using topological sort."""
        # Build in-degree count
        in_degree = defaultdict(int)
        for model_name, deps in self.dependencies.items():
            for dep in deps:
                if dep in self.models:  # Only count dependencies that are actual models
                    in_degree[dep] += 1
        
        # Initialize queue with models that have no dependencies
        queue = deque([name for name in self.models if in_degree[name] == 0])
        sorted_models = []
        
        while queue:
            model_name = queue.popleft()
            sorted_models.append(model_name)
            
            # Reduce in-degree for all models that depend on this one
            for dep_name, deps in self.dependencies.items():
                if model_name in deps:
                    in_degree[dep_name] -= 1
                    if in_degree[dep_name] == 0:
                        queue.append(dep_name)
        
        # Handle any remaining models
        remaining = [name for name in self.models if name not in sorted_models]
        if remaining:
            print(f"Warning: Models with unresolved dependencies: {remaining}")
            # Try to sort remaining models by their dependencies
            remaining_sorted = []
            remaining_set = set(remaining)
            
            # First, add models that don't depend on other remaining models
            for model_name in remaining:
                deps = self.dependencies[model_name]
                if not deps.intersection(remaining_set):
                    remaining_sorted.append(model_name)
            
            # Then add the rest
            for model_name in remaining:
                if model_name not in remaining_sorted:
                    remaining_sorted.append(model_name)
            
            sorted_models.extend(remaining_sorted)
        
        return sorted_models

    def convert_model(self, model_class: type) -> str:
        """Convert a Pydantic model to a Marshmallow schema."""
        try:
            class_name = model_class.__name__
            fields = getattr(model_class, 'model_fields', {})
            
            schema_lines = [f"class CG{class_name}Schema(Schema):"]
            
            for field_name, field_info in fields.items():
                try:
                    # Get the actual field type by inspecting the annotation
                    field_type = self._get_field_type_direct(field_info)
                    marshmallow_field = self._convert_field_type_direct(field_info)
                    
                    # Handle field metadata
                    metadata = self._extract_field_metadata(field_info)
                    
                    # Handle required fields - check if field is optional
                    is_optional = self._is_field_optional(field_info)
                    
                    # Build field definition
                    metadata_parts = [metadata] if metadata else []
                    if is_optional:
                        metadata_parts.append("allow_none=True")
                    
                    if metadata_parts:
                        # Check if this is a nested field or list field that already has parentheses
                        if "fields.Nested(" in marshmallow_field or "fields.List(" in marshmallow_field:
                            # For nested/list fields, add metadata to the existing constructor
                            field_def = f"    {field_name} = {marshmallow_field[:-1]}, {', '.join(metadata_parts)})"
                        else:
                            field_def = f"    {field_name} = {marshmallow_field}({', '.join(metadata_parts)})"
                    else:
                        # Check if this is a nested field or list field that already has parentheses
                        if "fields.Nested(" in marshmallow_field or "fields.List(" in marshmallow_field:
                            # For nested/list fields, we need the closing parenthesis
                            field_def = f"    {field_name} = {marshmallow_field}"
                        else:
                            field_def = f"    {field_name} = {marshmallow_field}()"
                    
                    schema_lines.append(field_def)
                except Exception as e:
                    print(f"Error processing field {field_name} in {class_name}: {e}")
                    # Add a placeholder field
                    schema_lines.append(f"    {field_name} = fields.Raw()")
            
            schema_lines.append("")
            return "\n".join(schema_lines)
        except Exception as e:
            print(f"Error converting model {model_class.__name__}: {e}")
            return f"class {model_class.__name__}Schema(Schema):\n    pass\n"

    def _get_field_type_direct(self, field_info) -> str:
        """Get field type directly from the field info."""
        if not hasattr(field_info, 'annotation') or field_info.annotation is None:
            return "Any"
        
        annotation = field_info.annotation
        
        # Handle string annotations
        if isinstance(annotation, str):
            return annotation
        
        # Handle type annotations
        if hasattr(annotation, '__origin__'):
            origin = annotation.__origin__
            args = annotation.__args__
            
            if origin is list or origin is List:
                if args and args[0] is not type(None):
                    return f"List[{self._get_type_name(args[0])}]"
                else:
                    return "List"
            elif origin is Union:
                # Handle Optional types (Union[T, None])
                non_none_args = [arg for arg in args if arg is not type(None)]
                if len(non_none_args) == 1:
                    return f"Optional[{self._get_type_name(non_none_args[0])}]"
                else:
                    # Filter out None values and handle them properly
                    valid_args = []
                    for arg in non_none_args:
                        if arg is not None:
                            valid_args.append(self._get_type_name(arg))
                    return f"Union[{', '.join(valid_args)}]"
            else:
                return str(annotation)
        elif hasattr(annotation, '_name') and annotation._name == "Literal":
            # Handle Literal types - convert to string
            return "str"
        else:
            return self._get_type_name(annotation)

    def _convert_field_type_direct(self, field_info) -> str:
        """Convert a Pydantic field type to a Marshmallow field by directly inspecting the annotation."""
        if not hasattr(field_info, 'annotation') or field_info.annotation is None:
            return "fields.Raw"
        
        annotation = field_info.annotation
        
        # Handle string annotations
        if isinstance(annotation, str):
            if annotation in self.TYPE_MAPPING:
                return f"fields.{self.TYPE_MAPPING[annotation]}"
            else:
                return f"fields.Nested('CG{annotation}Schema')"
        
        # Handle type annotations
        if hasattr(annotation, '__origin__'):
            origin = annotation.__origin__
            args = annotation.__args__
            
            # Handle Literal types first
            if origin is Literal:
                return "fields.String"
            
            if origin is list or origin is List:
                if args and args[0] is not type(None):
                    inner_arg = args[0]
                    # Check if the inner type is a Union
                    if hasattr(inner_arg, '__origin__') and inner_arg.__origin__ is Union:
                        return "fields.List(fields.Raw)"
                    else:
                        inner_type = self._get_type_name(inner_arg)
                        if inner_type in self.TYPE_MAPPING:
                            return f"fields.List(fields.{self.TYPE_MAPPING[inner_type]})"
                        else:
                            return f"fields.List(fields.Nested('CG{inner_type}Schema'))"
                else:
                    return "fields.List(fields.Raw)"
            elif origin is Union:
                # Handle Optional types (Union[T, None])
                non_none_args = [arg for arg in args if arg is not type(None)]
                if len(non_none_args) == 1:
                    # Recursively process the inner type
                    inner_annotation = non_none_args[0]
                    if hasattr(inner_annotation, '__origin__'):
                        # Handle complex inner types like list[str]
                        if inner_annotation.__origin__ is list or inner_annotation.__origin__ is List:
                            inner_args = getattr(inner_annotation, '__args__', None)
                            if inner_args and len(inner_args) > 0 and inner_args[0] is not type(None):
                                inner_type = self._get_type_name(inner_args[0])
                                if inner_type in self.TYPE_MAPPING:
                                    return f"fields.List(fields.{self.TYPE_MAPPING[inner_type]})"
                                else:
                                    return f"fields.List(fields.Nested('CG{inner_type}Schema'))"
                            else:
                                return "fields.List(fields.Raw)"
                        else:
                            # For other complex types, use Raw
                            return "fields.Raw"
                    else:
                        # Simple inner type
                        inner_type = self._get_type_name(inner_annotation)
                        if inner_type in self.TYPE_MAPPING:
                            return f"fields.{self.TYPE_MAPPING[inner_type]}"
                        else:
                            return f"fields.Nested('CG{inner_type}Schema')"
                else:
                    # Multiple non-None types in Union - use Raw
                    return "fields.Raw"
        elif hasattr(annotation, '_name') and annotation._name == "Literal":
            # Handle Literal types - convert to string
            return "fields.String"
        elif hasattr(annotation, '__origin__') and annotation.__origin__ is Literal:
            # Handle Literal types - convert to string
            return "fields.String"
        else:
            # Simple type
            type_name = self._get_type_name(annotation)
            if type_name in self.TYPE_MAPPING:
                return f"fields.{self.TYPE_MAPPING[type_name]}"
            elif type_name == "time":
                # Handle time type specifically
                return "fields.Time"
            elif type_name in self.BASIC_TYPES:
                # Handle basic types (including enums) as strings
                return "fields.String"
            else:
                # Check if this is a generic type (has type parameters)
                if self._is_generic_type(annotation):
                    return "fields.Raw"
                else:
                    return f"fields.Nested('CG{type_name}Schema')"

    def _is_field_optional(self, field_info) -> bool:
        """Check if a field is optional (can be None)."""
        # Check if field has a default value
        if hasattr(field_info, 'default') and field_info.default is not None:
            return True
        
        # Check if field has a default_factory
        if hasattr(field_info, 'default_factory') and field_info.default_factory is not None:
            return True
        
        # Check if the annotation is Optional or Union with None
        if hasattr(field_info, 'annotation') and field_info.annotation is not None:
            annotation = field_info.annotation
            
            # Handle string annotations
            if isinstance(annotation, str):
                return annotation.startswith("Optional[") or "None" in annotation
            
            # Handle type annotations
            if hasattr(annotation, '__origin__'):
                origin = annotation.__origin__
                args = getattr(annotation, '__args__', None)
                
                if origin is Union and args:
                    # Check if None is in the Union
                    return type(None) in args
                elif origin is list or origin is List:
                    # List fields are generally optional
                    return True
        
        # For fields that might be None, be more permissive
        # Check if the field type suggests it could be None
        field_type = self._get_field_type_direct(field_info)
        if field_type in ["str", "datetime", "date", "time", "HttpUrl", "AnyUrl"]:
            # These types are often optional in practice
            return True
        
        # Default to required
        return False

    def _extract_field_metadata(self, field_info) -> str:
        """Extract metadata from a Pydantic field."""
        metadata_parts = []
        
        # Add description if available
        if hasattr(field_info, 'description') and field_info.description:
            metadata_parts.append(f'description="{field_info.description}"')
        
        # Add data_key if available
        if hasattr(field_info, 'alias') and field_info.alias:
            metadata_parts.append(f'data_key="{field_info.alias}"')
        
        return ", ".join(metadata_parts)



    def generate_marshmallow_file(self) -> str:
        """Generate the complete marshmallow file content."""
        # Find all models
        models = self.find_all_models()
        print(f"Found {len(models)} models")
        
        # Analyze dependencies
        self.analyze_dependencies(models)
        
        # Sort models by dependencies
        sorted_model_names = self.topological_sort()
        print(f"Sorted models: {sorted_model_names}")
        
        # Generate schemas
        schema_definitions = []
        for model_name in sorted_model_names:
            model_class = self.models[model_name]
            schema_def = self.convert_model(model_class)
            schema_definitions.append(schema_def)
            self.generated_schemas.add(model_name)
        
        # Build the complete file
        file_content = [
            '"""Generated Marshmallow schemas for CommonGrants Protocol models."""',
            "",
            "from marshmallow import Schema, fields",
            "",
        ]
        
        file_content.extend(schema_definitions)
        
        return "\n".join(file_content)


def main():
    """Main function to generate marshmallow models."""
    if len(sys.argv) != 2:
        print("Usage: python generate_mm_schema.py <output_filename>")
        print("Example: python generate_mm_schema.py common-grants-mm-schema.py")
        sys.exit(1)

    output_filename = sys.argv[1]

    try:
        converter = PydanticToMarshmallowConverter()
        content = converter.generate_marshmallow_file()
        
        # Create output path
        output_path = Path(output_filename)
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
