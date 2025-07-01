#!/usr/bin/env python3

"""
Script to generate OpenAPI specifications for the CommonGrants API.

This module provides functionality to generate OpenAPI specifications.
"""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from common_grants.routes import opportunity_router


def get_openapi_schema() -> dict[str, Any]:
    """
    Generate OpenAPI schema.

    Returns:
        dict: The OpenAPI schema

    """
    # Return cached schema if available
    if app.openapi_schema:
        return app.openapi_schema

    # Generate base schema using FastAPI's built-in generator
    app.openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    return app.openapi_schema


app = FastAPI(
    title="CommonGrants API",
    description="An implementation of the CommonGrants API specification",
    version="0.1.0",
)
app.include_router(opportunity_router)

if __name__ == "__main__":
    import yaml

    print(yaml.dump(get_openapi_schema(), sort_keys=False))  # noqa: T201
