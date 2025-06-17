"""Shared test fixtures for the CommonGrants API tests."""

import pytest
from fastapi.testclient import TestClient

from ca_common_grants.api import app


@pytest.fixture(scope="session", name="client")
def test_client() -> TestClient:
    """Create a test client for the CommonGrants API."""
    return TestClient(app)
