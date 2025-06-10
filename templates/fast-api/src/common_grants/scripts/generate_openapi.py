#!/usr/bin/env python3

import argparse
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.constants import REF_PREFIX

from common_grants.routes import opportunity_router

# OpenAPI version constants
OPENAPI_V3 = "3.0.0"
DEFAULT_VERSION = "default"

def convert_to_openapi_v3(schema):
    """
    Convert a FastAPI OpenAPI schema to OpenAPI 3.0.0 format.
    
    Args:
        schema: The base OpenAPI schema from FastAPI
        
    Returns:
        dict: The schema converted to OpenAPI 3.0.0 format
    """
    # Set OpenAPI version
    schema["openapi"] = OPENAPI_V3
    
    # Move schemas from components to definitions for OpenAPI 3.0.0 compatibility
    if "components" in schema and "schemas" in schema["components"]:
        schema["definitions"] = schema["components"]["schemas"]
        del schema["components"]["schemas"]

    # Convert all schema references from components to definitions
    def convert_refs(obj):
        if isinstance(obj, dict):
            new_obj = {}
            for key, value in obj.items():
                if key == "$defs":
                    new_obj["definitions"] = value
                else:
                    new_obj[key] = value
                    if key == "$ref" and isinstance(value, str):
                        if "#/components/schemas/" in value:
                            new_obj[key] = value.replace("#/components/schemas/", "#/definitions/")
                        elif "#/$defs/" in value:
                            new_obj[key] = value.replace("#/$defs/", "#/definitions/")
            return {k: convert_refs(v) for k, v in new_obj.items()}
        elif isinstance(obj, list):
            return [convert_refs(item) for item in obj]
        return obj

    # Remove any remaining components section if empty
    if "components" in schema and not schema["components"]:
        del schema["components"]

    return convert_refs(schema)

def get_openapi_schema(version=DEFAULT_VERSION):
    """
    Generate OpenAPI schema for the specified version.
    
    Args:
        version: Either DEFAULT_VERSION for FastAPI's default version or OPENAPI_V3 for OpenAPI 3.0.0
        
    Returns:
        dict: The OpenAPI schema
    """
    # Return cached schema if available
    if app.openapi_schema:
        return app.openapi_schema

    # Generate base schema using FastAPI's built-in generator
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Cache and return the schema as-is for default version
    if version == DEFAULT_VERSION:
        app.openapi_schema = openapi_schema
        return openapi_schema
    
    # Special case: Apply OpenAPI 3.0.0 specific transformations
    if version == OPENAPI_V3:
        openapi_schema = convert_to_openapi_v3(openapi_schema)
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app = FastAPI(
    title="CommonGrants API",
    description="An implementation of the CommonGrants API specification",
    version="0.1.0",
)
app.include_router(opportunity_router)

if __name__ == '__main__':
    import yaml
    
    parser = argparse.ArgumentParser(description='Generate OpenAPI specification')
    parser.add_argument('--version', choices=[DEFAULT_VERSION, OPENAPI_V3], default=DEFAULT_VERSION,
                      help=f'OpenAPI version to generate (default: {DEFAULT_VERSION})')
    args = parser.parse_args()
    
    print(yaml.dump(get_openapi_schema(args.version), sort_keys=False)) 