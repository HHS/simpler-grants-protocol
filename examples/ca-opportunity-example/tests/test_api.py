"""Tests for the FastAPI application setup."""

from fastapi.testclient import TestClient
from starlette.status import HTTP_200_OK

from ca_common_grants.api import app


def test_app_initialization() -> None:
    """Test that the FastAPI app is properly initialized."""
    assert app.title == "CA Grant Opportunity API - Example"
    assert app.version == "0.1.0"
    assert (
        app.description
        == "API for getting California Grant Data via CommonGrants Protocol"
    )


def test_router_inclusion() -> None:
    """Test that the opportunities router is included."""
    client = TestClient(app)
    response = client.get("/common-grants/opportunities")
    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert "paginationInfo" in data


def test_api_docs() -> None:
    """Test that API documentation is available."""
    client = TestClient(app)
    response = client.get("/docs")
    assert response.status_code == HTTP_200_OK
    assert "swagger-ui" in response.text.lower()


def test_openapi_schema() -> None:
    """Test that OpenAPI schema is available."""
    client = TestClient(app)
    response = client.get("/openapi.json")
    assert response.status_code == HTTP_200_OK
    schema = response.json()
    assert "openapi" in schema
    assert "info" in schema
    assert "paths" in schema
