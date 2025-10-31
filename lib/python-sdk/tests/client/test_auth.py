"""Tests for the Auth class."""

from common_grants_sdk.client import Auth


class TestAuth:
    """Tests for the Auth class."""

    def test_api_key_auth(self):
        """Test creating auth with API key."""
        auth = Auth.api_key("test-api-key")
        headers = auth.get_headers()
        assert headers == {
            "X-API-Key": "test-api-key",
            "Accept": "application/json",
        }

    def test_bearer_auth(self):
        """Test creating auth with bearer token."""
        auth = Auth.bearer("test-token")
        headers = auth.get_headers()
        assert headers == {
            "Authorization": "Bearer test-token",
            "Accept": "application/json",
        }

    def test_auth_headers_are_copied(self):
        """Test that get_headers returns a copy, not a reference."""
        auth = Auth.api_key("test-key")
        headers1 = auth.get_headers()
        headers2 = auth.get_headers()
        assert headers1 is not headers2
        assert headers1 == headers2

    def test_custom_auth(self):
        """Test creating auth with custom headers."""
        auth = Auth(headers={"Custom-Header": "custom-value"})
        headers = auth.get_headers()
        assert headers == {
            "Custom-Header": "custom-value",
            "Accept": "application/json",
        }
