#!/usr/bin/env python3
"""Script to generate marshmallow models from PySDK pydantic models."""

import importlib
import inspect
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Literal
from pydantic import BaseModel


class TypeConverter:
    """Handles conversion of Pydantic types to Marshmallow field types."""
    
    # Basic type mappings
    BASIC_TYPE_MAPPING = {
        "str": "String",
        "int": "Integer", 
        "float": "Decimal",
        "bool": "Boolean",
        "UUID": "UUID",
        "datetime": "Raw",
        "date": "Date",
        "time": "Time",
        "dict": "Raw",
        "list": "List",
        "List": "List",
        "Optional": "Optional",
        "Union": "Union",
        "Any": "Raw",
        "HttpUrl": "Raw",
        "EmailStr": "Raw",
        "AnyUrl": "Raw",
        "DecimalString": "String",  # Custom validation will be added
        "ISODate": "Date",
        "ISOTime": "Time",
        "UTCDateTime": "DateTime",
    }
    
    # Types that should be treated as basic types (not nested schemas)
    BASIC_TYPES = {
        "UUID", "HttpUrl", "EmailStr", "AnyUrl", "datetime", "date",
        "DecimalString", "ISODate", "ISOTime", "UTCDateTime",
        "ArrayOperator", "StringOperator", "RangeOperator", "ComparisonOperator",
        "EquivalenceOperator", "OppStatusOptions", "OppSortBy", "UnionType", "CustomFieldType",
        "EventType", "SortOrder",
    }
    
    @classmethod
    def get_type_name(cls, type_obj) -> str:
        """Extract the name of a type object."""
        if hasattr(type_obj, '__name__'):
            return type_obj.__name__
        elif hasattr(type_obj, '_name'):
            return type_obj._name
        else:
            # Handle generic types that get converted to strings
            type_str = str(type_obj)
            if "[" in type_str and "]" in type_str:
                # Extract base type name from generic type string
                base_type = type_str.split("[")[0]
                return base_type
            return type_str
    
    @classmethod
    def is_basic_type(cls, type_name: str) -> bool:
        """Check if a type should be treated as a basic type."""
        return type_name in cls.BASIC_TYPE_MAPPING or type_name in cls.BASIC_TYPES
    
    @classmethod
    def convert_annotation(cls, annotation) -> str:
        """Convert a Pydantic field annotation to a Marshmallow field type."""
        if annotation is None:
            return "fields.Raw"
        
        # Handle string annotations
        if isinstance(annotation, str):
            return cls._convert_string_annotation(annotation)
        
        # Handle type annotations
        if hasattr(annotation, '__origin__'):
            return cls._convert_generic_annotation(annotation)
        
        # Handle Literal types
        if cls._is_literal_type(annotation):
            return "fields.String"
        
        # Check if this is a generic type (has type arguments)
        if cls._is_generic_type(annotation):
            return "fields.Raw"
        
        # Handle simple types
        type_name = cls.get_type_name(annotation)
        return cls._convert_simple_type(type_name)
    
    @classmethod
    def _convert_string_annotation(cls, annotation: str) -> str:
        """Convert a string annotation to a Marshmallow field."""
        if annotation in cls.BASIC_TYPE_MAPPING:
            return f"fields.{cls.BASIC_TYPE_MAPPING[annotation]}"
        elif annotation == "Event":
            return "fields.Nested('CGSingleDateEvent')"
        elif annotation == "dict":
            return "fields.Raw"
        elif annotation in ["FilterT", "ItemsT", "T"]:
            return "fields.Raw"
        elif "[" in annotation and "]" in annotation:
            # Handle generic type annotations like "FilterInfo[dict]"
            base_type = annotation.split("[")[0]
            if base_type in ["FilterInfo", "FilterT", "ItemsT"]:
                return "fields.Raw"
            else:
                # For generic types, use the base type name without generic parameters
                return f"fields.Nested('CG{base_type}')"
        else:
            return f"fields.Nested('CG{annotation}')"
    
    @classmethod
    def _convert_generic_annotation(cls, annotation) -> str:
        """Convert a generic type annotation to a Marshmallow field."""
        origin = annotation.__origin__
        args = getattr(annotation, '__args__', None)
        
        # Handle Literal types
        if origin is Literal:
            return "fields.String"
        
        # Handle List types
        if origin is list or origin is List:
            return cls._convert_list_type(args)
        
        # Handle Union types
        if origin is Union:
            return cls._convert_union_type(args)
        
        # For all other generic types, use Raw
        return "fields.Raw"
    
    @classmethod
    def _convert_list_type(cls, args) -> str:
        """Convert a List type to a Marshmallow field."""
        if not args or args[0] is type(None):
            return "fields.List(fields.Raw)"
        
        inner_type = args[0]
        
        # Handle Union in list
        if hasattr(inner_type, '__origin__') and inner_type.__origin__ is Union:
            return "fields.List(fields.Raw)"
        
        inner_type_name = cls.get_type_name(inner_type)
        
        if cls.is_basic_type(inner_type_name):
            field_type = cls.BASIC_TYPE_MAPPING.get(inner_type_name, "Raw")
            return f"fields.List(fields.{field_type})"
        elif inner_type_name == "Event":
            return "fields.List(fields.Nested('CGSingleDateEvent'))"
        elif inner_type_name == "dict":
            return "fields.List(fields.Raw)"
        else:
            return f"fields.List(fields.Nested('CG{inner_type_name}'))"
    
    @classmethod
    def _convert_union_type(cls, args) -> str:
        """Convert a Union type to a Marshmallow field."""
        if not args:
            return "fields.Raw"
        
        # Filter out None values
        non_none_args = [arg for arg in args if arg is not type(None)]
        
        if len(non_none_args) == 1:
            # Optional type - recursively convert the inner type
            return cls.convert_annotation(non_none_args[0])
        
        # Check if this is the Event union type
        union_types = [cls.get_type_name(arg) for arg in non_none_args]
        if set(union_types) == {"SingleDateEvent", "DateRangeEvent", "OtherEvent"}:
            return "fields.Nested('CGSingleDateEvent')"
        
        # Multiple non-None types - use Raw
        return "fields.Raw"
    
    @classmethod
    def _is_literal_type(cls, annotation) -> bool:
        """Check if an annotation is a Literal type."""
        return (hasattr(annotation, '_name') and annotation._name == "Literal" or
                hasattr(annotation, '__origin__') and annotation.__origin__ is Literal)
    
    @classmethod
    def _is_generic_type(cls, type_obj) -> bool:
        """Check if a type is a generic type."""
        # Check if it has type arguments
        if hasattr(type_obj, '__args__') and type_obj.__args__:
            return True
        
        # Check if the string representation contains square brackets
        type_str = str(type_obj)
        if '[' in type_str and ']' in type_str:
            return True
        
        return False

    @classmethod
    def _convert_simple_type(cls, type_name: str) -> str:
        """Convert a simple type name to a Marshmallow field."""
        if cls.is_basic_type(type_name):
            field_type = cls.BASIC_TYPE_MAPPING.get(type_name, "String")
            return f"fields.{field_type}"
        elif type_name == "Event":
            return "fields.Nested('CGSingleDateEvent')"
        elif type_name == "dict":
            return "fields.Raw"
        elif "[" in type_name and "]" in type_name:
            # Handle generic type names that got converted to strings
            base_type = type_name.split("[")[0]
            if base_type in ["FilterInfo", "FilterT", "ItemsT"]:
                return "fields.Raw"
            else:
                return f"fields.Nested('CG{base_type}')"
        else:
            return f"fields.Nested('CG{type_name}')"


class FieldProcessor:
    """Handles processing of individual Pydantic fields."""
    
    @staticmethod
    def is_optional(field_info) -> bool:
        """Check if a field is optional."""
        # Check for default values
        if (hasattr(field_info, 'default') and field_info.default is not None or
            hasattr(field_info, 'default_factory') and field_info.default_factory is not None):
            return True
        
        # Check annotation for Optional/Union with None
        if hasattr(field_info, 'annotation') and field_info.annotation is not None:
            annotation = field_info.annotation
            
            if isinstance(annotation, str):
                return annotation.startswith("Optional[") or "None" in annotation
            
            if hasattr(annotation, '__origin__') and annotation.__origin__ is Union:
                args = getattr(annotation, '__args__', None)
                return args and type(None) in args
        
        # Default to required
        return False
    
    @staticmethod
    def extract_metadata(field_info) -> tuple[dict, str]:
        """Extract metadata and data_key from a field."""
        metadata = {}
        data_key = None
        
        # Add description if available
        if hasattr(field_info, 'description') and field_info.description:
            metadata['description'] = field_info.description
        
        # Extract data_key (alias)
        if hasattr(field_info, 'alias') and field_info.alias:
            data_key = field_info.alias
        
        return metadata, data_key
    
    @staticmethod
    def build_field_definition(field_name: str, marshmallow_field: str, 
                             metadata: dict, data_key: str, is_optional: bool) -> str:
        """Build a complete field definition."""
        # Direct arguments
        direct_args = []
        if is_optional:
            direct_args.append("allow_none=True")
        if data_key:
            direct_args.append(f'data_key="{data_key}"')
        
        # Handle nested/list fields
        if "fields.Nested(" in marshmallow_field or "fields.List(" in marshmallow_field:
            return FieldProcessor._build_complex_field(field_name, marshmallow_field, metadata, direct_args)
        else:
            return FieldProcessor._build_simple_field(field_name, marshmallow_field, metadata, direct_args)
    
    @staticmethod
    def _build_complex_field(field_name: str, marshmallow_field: str, 
                           metadata: dict, direct_args: list) -> str:
        """Build a complex field definition (nested/list)."""
        if metadata:
            metadata_str = ", ".join([f'"{k}": "{v}"' for k, v in metadata.items()])
            if direct_args:
                return f"    {field_name} = {marshmallow_field[:-1]}, metadata={{{metadata_str}}}, {', '.join(direct_args)})"
            else:
                return f"    {field_name} = {marshmallow_field[:-1]}, metadata={{{metadata_str}}})"
        else:
            if direct_args:
                return f"    {field_name} = {marshmallow_field[:-1]}, {', '.join(direct_args)})"
            else:
                return f"    {field_name} = {marshmallow_field}"
    
    @staticmethod
    def _build_simple_field(field_name: str, marshmallow_field: str, 
                          metadata: dict, direct_args: list) -> str:
        """Build a simple field definition."""
        args = []
        if metadata:
            metadata_str = ", ".join([f'"{k}": "{v}"' for k, v in metadata.items()])
            args.append(f"metadata={{{metadata_str}}}")
        args.extend(direct_args)
        
        if args:
            return f"    {field_name} = {marshmallow_field}({', '.join(args)})"
        else:
            return f"    {field_name} = {marshmallow_field}()"


class SchemaGenerator:
    """Generates different types of Marshmallow schemas based on the object type."""
    
    def __init__(self):
        self.type_converter = TypeConverter()
        self.field_processor = FieldProcessor()
    
    def generate_schema(self, obj: type, name: str) -> str:
        """Generate appropriate marshmallow schema based on object type."""
        import enum
        
        try:
            if self._is_pydantic_model(obj):
                return self._generate_model_schema(obj, name)
            elif self._is_enum(obj):
                return self._generate_enum_schema(obj, name)
            elif self._is_custom_type(obj):
                return self._generate_type_schema(obj, name)
            else:
                return self._generate_fallback_schema(obj, name)
        except Exception as e:
            print(f"Error in generate_schema for {name}: {e}")
            return self._generate_fallback_schema(obj, name)
    
    def _is_pydantic_model(self, obj: type) -> bool:
        """Check if object is a Pydantic model."""
        return (hasattr(obj, 'model_fields') or 
                hasattr(obj, '__fields__') or
                (hasattr(obj, '__bases__') and any(issubclass(base, BaseModel) for base in obj.__bases__)))
    
    def _is_enum(self, obj: type) -> bool:
        """Check if object is an enum."""
        import enum
        try:
            return (hasattr(obj, '__bases__') and 
                    any(issubclass(base, enum.Enum) for base in obj.__bases__))
        except Exception:
            return False
    
    def _is_custom_type(self, obj: type) -> bool:
        """Check if object is a custom type (like Annotated types)."""
        try:
            return (hasattr(obj, '__module__') and 
                    obj.__module__.startswith('common_grants_sdk') and
                    not self._is_pydantic_model(obj) and
                    not self._is_enum(obj))
        except Exception:
            return False
    
    def _generate_model_schema(self, model_class: type, name: str) -> str:
        """Generate a marshmallow schema for a Pydantic model."""
        try:
            fields = getattr(model_class, 'model_fields', {})
            
            schema_lines = [f"class CG{name}(Schema):"]
            
            if not fields:
                schema_lines.append("    pass")
            else:
                for field_name, field_info in fields.items():
                    try:
                        field_def = self._convert_field(field_name, field_info)
                        schema_lines.append(field_def)
                    except Exception as e:
                        print(f"Error processing field {field_name} in {name}: {e}")
                        schema_lines.append(f"    {field_name} = fields.Raw()")
            
            schema_lines.append("")
            return "\n".join(schema_lines)
        except Exception as e:
            print(f"Error converting model {name}: {e}")
            return f"class CG{name}(Schema):\n    pass\n"
    
    def _generate_enum_schema(self, enum_class: type, name: str) -> str:
        """Generate a marshmallow field for an enum."""
        try:
            # Get enum values
            enum_values = [e.value for e in enum_class]
            enum_values_str = ", ".join([f'"{v}"' for v in enum_values])
            
            schema_lines = [
                f"class CG{name}Field(fields.String):",
                f'    """Marshmallow field for {name} enum."""',
                f"    def __init__(self, **kwargs):",
                f"        super().__init__(validate=validate.OneOf([{enum_values_str}]), **kwargs)",
                ""
            ]
            return "\n".join(schema_lines)
        except Exception as e:
            print(f"Error converting enum {name}: {e}")
            return f"class CG{name}Field(fields.String):\n    pass\n"
    
    def _generate_type_schema(self, type_obj: type, name: str) -> str:
        """Generate a marshmallow field for a custom type."""
        if name == "DecimalString":
            return self._generate_decimal_string_field(name)
        elif name in ["ISODate", "ISOTime", "UTCDateTime"]:
            return self._generate_datetime_field(name)
        else:
            return self._generate_fallback_schema(type_obj, name)
    
    def _generate_decimal_string_field(self, name: str) -> str:
        """Generate a marshmallow field for DecimalString with validation."""
        schema_lines = [
            f"class CG{name}Field(fields.String):",
            f'    """Marshmallow field for {name} with decimal validation."""',
            f"    def __init__(self, **kwargs):",
            f"        super().__init__(validate=self._validate_decimal, **kwargs)",
            "",
            f"    def _validate_decimal(self, value):",
            f"        import re",
            f'        if not re.match(r"^-?\\d*\\.?\\d+$", value):',
            f'            raise ValidationError("Value must be a valid decimal number")',
            f"        return value",
            ""
        ]
        return "\n".join(schema_lines)
    
    def _generate_datetime_field(self, name: str) -> str:
        """Generate a marshmallow field for datetime types."""
        field_type = {
            "ISODate": "Date",
            "ISOTime": "Time", 
            "UTCDateTime": "DateTime"
        }.get(name, "String")
        
        schema_lines = [
            f"class CG{name}Field(fields.{field_type}):",
            f'    """Marshmallow field for {name}."""',
            f"    pass",
            ""
        ]
        return "\n".join(schema_lines)
    
    def _generate_fallback_schema(self, obj: type, name: str) -> str:
        """Generate a fallback schema for unknown types."""
        schema_lines = [
            f"class CG{name}Field(fields.Raw):",
            f'    """Marshmallow field for {name}."""',
            f"    pass",
            ""
        ]
        return "\n".join(schema_lines)
    
    def generate_common_grants_base_model_schema(self) -> str:
        """Generate the CommonGrantsBaseModel schema."""
        schema_lines = [
            "class CGCommonGrantsBaseModel(Schema):",
            '    """Marshmallow schema for CommonGrantsBaseModel."""',
            "    pass",
            ""
        ]
        return "\n".join(schema_lines)
    
    def _convert_field(self, field_name: str, field_info) -> str:
        """Convert a single field to a Marshmallow field definition."""
        # Convert the field type
        marshmallow_field = self.type_converter.convert_annotation(field_info.annotation)
        
        # Extract metadata
        metadata, data_key = self.field_processor.extract_metadata(field_info)
        
        # Check if optional
        is_optional = self.field_processor.is_optional(field_info)
        
        # Build the field definition
        return self.field_processor.build_field_definition(
            field_name, marshmallow_field, metadata, data_key, is_optional
        )


class ModelConverter:
    """Converts a Pydantic model to a Marshmallow schema."""
    
    def __init__(self):
        self.type_converter = TypeConverter()
        self.field_processor = FieldProcessor()
    
    def convert_model(self, model_class: type) -> str:
        """Convert a Pydantic model to a Marshmallow schema definition."""
        try:
            class_name = model_class.__name__
            fields = getattr(model_class, 'model_fields', {})
            
            schema_lines = [f"class CG{class_name}(Schema):"]
            
            if not fields:
                schema_lines.append("    pass")
            else:
                for field_name, field_info in fields.items():
                    try:
                        field_def = self._convert_field(field_name, field_info)
                        schema_lines.append(field_def)
                    except Exception as e:
                        print(f"Error processing field {field_name} in {class_name}: {e}")
                        schema_lines.append(f"    {field_name} = fields.Raw()")
            
            schema_lines.append("")
            return "\n".join(schema_lines)
        except Exception as e:
            print(f"Error converting model {model_class.__name__}: {e}")
            return f"class CG{model_class.__name__}(Schema):\n    pass\n"
    
    def _convert_field(self, field_name: str, field_info) -> str:
        """Convert a single field to a Marshmallow field definition."""
        # Convert the field type
        marshmallow_field = self.type_converter.convert_annotation(field_info.annotation)
        
        # Extract metadata
        metadata, data_key = self.field_processor.extract_metadata(field_info)
        
        # Check if optional
        is_optional = self.field_processor.is_optional(field_info)
        
        # Build the field definition
        return self.field_processor.build_field_definition(
            field_name, marshmallow_field, metadata, data_key, is_optional
        )


class MainSchemaGenerator:
    """Main class for generating Marshmallow schemas from Pydantic models."""
    
    def __init__(self):
        self.converter = ModelConverter()
        self.schema_generator = SchemaGenerator()
    
    def find_models_from_init(self) -> List[type]:
        """Find all Pydantic models listed in the __init__.py file in the exact order they appear."""
        models = []
        
        # Find the __init__.py file relative to this script
        script_dir = Path(__file__).parent
        init_file = script_dir.parent / "common_grants_sdk" / "schemas" / "pydantic" / "__init__.py"
        
        if not init_file.exists():
            print(f"Could not find __init__.py file at: {init_file}")
            return []
        
        # Parse the __init__.py file to extract model names and their source modules
        model_info = self._parse_init_file(init_file)
        
        # Now import the actual model classes from their individual modules
        try:
            import sys
            # Add the python-sdk directory to the path
            python_sdk_dir = script_dir.parent
            if str(python_sdk_dir) not in sys.path:
                sys.path.insert(0, str(python_sdk_dir))
            
            # Import each object from its individual module to avoid the marshmallow import issue
            for name, module_name in model_info:
                try:
                    # Import the specific module that contains this object
                    module = importlib.import_module(f"common_grants_sdk.schemas.pydantic.{module_name}")
                    obj = getattr(module, name)
                    
                    # Include all relevant objects (models, enums, types, etc.)
                    if inspect.isclass(obj):
                        models.append((obj, name))
                        
                        # If this is a Union type, also include all its constituents
                        if hasattr(obj, '__origin__') and obj.__origin__ is Union:
                            union_constituents = self._extract_union_constituents(obj)
                            for constituent in union_constituents:
                                if constituent not in [m[1] for m in models]:  # Avoid duplicates
                                    models.append((constituent, constituent.__name__))
                                    
                    elif inspect.isfunction(obj) or hasattr(obj, '__module__'):
                        # Include functions and other objects that might be types
                        models.append((obj, name))
                except (AttributeError, TypeError, ImportError):
                    # Skip non-class attributes or non-model classes
                    continue
                    
        except Exception as e:
            print(f"Error importing models: {e}")
            return []
        
        return models
    
    def _extract_union_constituents(self, union_type) -> List[type]:
        """Extract all constituent types from a Union type."""
        constituents = []
        
        if hasattr(union_type, '__args__'):
            for arg in union_type.__args__:
                if arg is not type(None):  # Skip None
                    if inspect.isclass(arg):
                        constituents.append(arg)
                    elif hasattr(arg, '__origin__') and arg.__origin__ is Union:
                        # Recursively handle nested unions
                        constituents.extend(self._extract_union_constituents(arg))
        
        return constituents
    
    def _parse_init_file(self, init_file: Path) -> List[tuple[str, str]]:
        """Parse the __init__.py file to extract model names and their source modules from __all__."""
        model_info = []
        
        try:
            with open(init_file, 'r') as f:
                content = f.read()
            
            # Parse the file to understand the import structure
            import ast
            
            try:
                tree = ast.parse(content)
                
                # First, build a mapping of imported names to their source modules
                import_mapping = {}
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ImportFrom):
                        module_name = node.module
                        for alias in node.names:
                            import_mapping[alias.name] = module_name
                
                # Then find the __all__ list
                for node in ast.walk(tree):
                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name) and target.id == '__all__':
                                if isinstance(node.value, ast.List):
                                    for item in node.value.elts:
                                        if isinstance(item, ast.Constant) and isinstance(item.value, str):
                                            model_name = item.value
                                            # Find which module this model comes from
                                            module_name = import_mapping.get(model_name, 'base')  # default to 'base'
                                            model_info.append((model_name, module_name))
                                    break
            except SyntaxError:
                # Fallback: simple regex-based parsing
                import re
                
                # Extract import statements to build mapping
                import_mapping = {}
                for match in re.finditer(r'from \.(\w+) import \((.*?)\)', content, re.DOTALL):
                    module_name = match.group(1)
                    imports = match.group(2)
                    for name_match in re.finditer(r'(\w+)', imports):
                        import_mapping[name_match.group(1)] = module_name
                
                # Extract __all__ list
                all_match = re.search(r'__all__\s*=\s*\[(.*?)\]', content, re.DOTALL)
                if all_match:
                    all_content = all_match.group(1)
                    # Extract quoted strings
                    for match in re.finditer(r'"([^"]+)"', all_content):
                        model_name = match.group(1)
                        module_name = import_mapping.get(model_name, 'base')
                        model_info.append((model_name, module_name))
            
        except Exception as e:
            print(f"Error parsing __init__.py file: {e}")
            return []
        
        return model_info
    
    def generate_schemas(self) -> str:
        """Generate all Marshmallow schemas."""
        # Find all objects
        objects = self.find_models_from_init()
        print(f"Found {len(objects)} objects to convert")
        
        if not objects:
            print("No objects found to convert")
            return ""
        
        # Ensure all referenced types are included
        objects = self._ensure_all_referenced_types_included(objects)
        print(f"After including referenced types: {len(objects)} objects to convert")
        
        # Convert objects in the order they appear in __init__.py
        schema_definitions = []
        converted_names = set()
        
        for obj, name in objects:
            schema_def = self.schema_generator.generate_schema(obj, name)
            schema_definitions.append(schema_def)
            print(f"Converted {name}")
            converted_names.add(name)
        
        # Check if CommonGrantsBaseModel was missed and add it at the beginning
        if "CommonGrantsBaseModel" not in converted_names:
            schema_def = self.schema_generator.generate_common_grants_base_model_schema()
            schema_definitions.insert(0, schema_def)
        
        # Build the complete file
        file_content = [
            '"""Generated Marshmallow schemas for CommonGrants Protocol models."""',
            "",
            "from marshmallow import Schema, fields, validate, ValidationError",
            "",
        ]
        
        file_content.extend(schema_definitions)
        
        return "\n".join(file_content)
    
    def _ensure_all_referenced_types_included(self, objects: List[tuple[type, str]]) -> List[tuple[type, str]]:
        """Ensure all types referenced in the schemas are included in the generation."""
        # Get all type names that are referenced in the schemas
        referenced_types = set()
        
        for obj, name in objects:
            if hasattr(obj, 'model_fields'):
                for field_name, field_info in obj.model_fields.items():
                    if hasattr(field_info, 'annotation') and field_info.annotation:
                        annotation = field_info.annotation
                        if hasattr(annotation, '__origin__') and annotation.__origin__ is Union:
                            # Extract Union constituents
                            constituents = self._extract_union_constituents(annotation)
                            for constituent in constituents:
                                referenced_types.add(constituent.__name__)
                        elif inspect.isclass(annotation):
                            referenced_types.add(annotation.__name__)
        
        # Add missing referenced types
        existing_names = {name for _, name in objects}
        missing_types = referenced_types - existing_names
        
        if missing_types:
            print(f"Adding missing referenced types: {missing_types}")
            
            # Try to find and import missing types
            try:
                import sys
                python_sdk_dir = Path(__file__).parent.parent
                if str(python_sdk_dir) not in sys.path:
                    sys.path.insert(0, str(python_sdk_dir))
                
                # Check common modules where these types might be defined
                modules_to_check = [
                    "common_grants_sdk.schemas.pydantic.fields.event",
                    "common_grants_sdk.schemas.pydantic.fields",
                    "common_grants_sdk.schemas.pydantic.models",
                    "common_grants_sdk.schemas.pydantic.filters",
                ]
                
                for type_name in missing_types:
                    for module_path in modules_to_check:
                        try:
                            module = importlib.import_module(module_path)
                            if hasattr(module, type_name):
                                obj = getattr(module, type_name)
                                if inspect.isclass(obj):
                                    objects.append((obj, type_name))
                                    print(f"Added missing type: {type_name} from {module_path}")
                                    break
                        except (ImportError, AttributeError):
                            continue
                            
            except Exception as e:
                print(f"Error adding missing types: {e}")
        
        return objects


def main():
    """Main function to generate marshmallow models."""
    if len(sys.argv) != 2:
        print("Usage: python generate_mm_schema.py <output_filename>")
        print("Example: python generate_mm_schema.py common-grants-mm-schema.py")
        sys.exit(1)

    output_filename = sys.argv[1]

    try:
        generator = MainSchemaGenerator()
        content = generator.generate_schemas()
        
        if not content:
            print("No content generated")
            sys.exit(1)
        
        # Create output path
        output_path = Path(output_filename)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to file
        with open(output_path, "w") as f:
            f.write(content)
        
        print(f"Generated marshmallow schemas at: {output_path}")
        
    except Exception as e:
        print(f"Error generating marshmallow schemas: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
