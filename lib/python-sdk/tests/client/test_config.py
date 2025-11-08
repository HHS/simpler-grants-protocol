"""Tests for the Config class."""

import pytest

from common_grants_sdk.client.config import Config


class TestConfig:
    """Tests for the Config class."""

    def test_required_base_url_and_api_key(self, monkeypatch):
        """Test that base_url and api_key are required."""
        # Clear any existing env vars
        monkeypatch.delenv("CG_API_BASE_URL", raising=False)
        monkeypatch.delenv("CG_API_KEY", raising=False)
        with pytest.raises(ValueError, match="base_url is required"):
            Config()

    def test_override_base_url(self):
        """Test overriding base URL."""
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.base_url == "https://api.example.com"

    def test_override_api_key(self):
        """Test overriding API key."""
        config = Config(base_url="https://api.example.com", api_key="custom-key")
        assert config.api_key == "custom-key"

    def test_override_timeout(self):
        """Test overriding timeout."""
        config = Config(
            base_url="https://api.example.com", api_key="test-key", timeout=30.0
        )
        assert config.timeout == 30.0

    def test_override_page_size(self):
        """Test overriding page size."""
        config = Config(
            base_url="https://api.example.com", api_key="test-key", page_size=50
        )
        assert config.page_size == 50

    def test_default_timeout(self):
        """Test default timeout value."""
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.timeout == Config.DEFAULT_TIMEOUT

    def test_default_page_size(self):
        """Test default page size value."""
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.page_size == Config.DEFAULT_PAGE_SIZE

    def test_environment_variable_base_url(self, monkeypatch):
        """Test loading base URL from environment variable."""
        monkeypatch.setenv("CG_API_BASE_URL", "https://env-api.example.com")
        config = Config(api_key="test-key")
        assert config.base_url == "https://env-api.example.com"

    def test_environment_variable_api_key(self, monkeypatch):
        """Test loading API key from environment variable."""
        monkeypatch.setenv("CG_API_KEY", "env-api-key")
        config = Config(base_url="https://api.example.com")
        assert config.api_key == "env-api-key"

    def test_environment_variable_timeout(self, monkeypatch):
        """Test loading timeout from environment variable."""
        monkeypatch.setenv("CG_API_TIMEOUT", "20")
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.timeout == 20.0

    def test_environment_variable_page_size(self, monkeypatch):
        """Test loading page size from environment variable."""
        monkeypatch.setenv("CG_API_PAGE_SIZE", "50")
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.page_size == 50

    def test_parameter_overrides_env_var(self, monkeypatch):
        """Test that parameters override environment variables."""
        monkeypatch.setenv("CG_API_BASE_URL", "https://env.example.com")
        config = Config(base_url="https://param.example.com", api_key="test-key")
        assert config.base_url == "https://param.example.com"

    def test_invalid_url_no_protocol(self):
        """Test that invalid URLs raise ValueError."""
        with pytest.raises(ValueError, match="must start with http:// or https://"):
            Config(base_url="invalid-url", api_key="test-key")

    def test_invalid_url_empty_string(self, monkeypatch):
        """Test that empty URL raises ValueError."""
        monkeypatch.delenv("CG_API_BASE_URL", raising=False)
        with pytest.raises(ValueError, match="base_url is required"):
            Config(base_url="", api_key="test-key")

    def test_http_url_valid(self):
        """Test that http:// URLs are valid."""
        config = Config(base_url="http://localhost:8080", api_key="test-key")
        assert config.base_url == "http://localhost:8080"

    def test_https_url_valid(self):
        """Test that https:// URLs are valid."""
        config = Config(base_url="https://api.example.com", api_key="test-key")
        assert config.base_url == "https://api.example.com"
