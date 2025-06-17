"""Tests for the OpenAPI generation script."""

from ca_common_grants.scripts.generate_openapi import (
    DEFAULT_VERSION,
    OPENAPI_V3,
    get_openapi_schema,
)


def test_get_openapi_schema_default() -> None:
    """Test OpenAPI schema generation with default version."""
    schema = get_openapi_schema(DEFAULT_VERSION)

    # Check required OpenAPI fields
    assert "openapi" in schema
    assert "info" in schema
    assert "paths" in schema
    assert "components" in schema

    # Check API info
    assert schema["info"]["title"] == "CA Grant Opportunity API - Example"
    assert schema["info"]["version"] == "0.1.0"

    # Check paths
    assert "/common-grants/opportunities" in schema["paths"]
    assert "/common-grants/opportunities/{id}" in schema["paths"]
    assert "/common-grants/opportunities/search" in schema["paths"]


def test_get_openapi_schema_v3() -> None:
    """Test OpenAPI schema generation with v3 version."""
    schema = get_openapi_schema(OPENAPI_V3)

    # Check required OpenAPI fields
    assert schema["openapi"] == "3.1.0"  # FastAPI uses 3.1.0 by default
    assert "info" in schema
    assert "paths" in schema
    assert "components" in schema  # FastAPI uses components instead of definitions

    # Check API info
    assert schema["info"]["title"] == "CA Grant Opportunity API - Example"
    assert schema["info"]["version"] == "0.1.0"

    # Check paths
    assert "/common-grants/opportunities" in schema["paths"]
    assert "/common-grants/opportunities/{id}" in schema["paths"]
    assert "/common-grants/opportunities/search" in schema["paths"]
