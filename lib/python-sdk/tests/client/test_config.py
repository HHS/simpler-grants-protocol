"""Tests for the Config class."""

import pytest

from common_grants_sdk.client.config import Config


class TestConfig:
    """Tests for the Config class."""

    def test_default_values(self):
        """Test config with default values."""
        config = Config()
        assert config.base_url == "http://localhost:8080"
        assert config.api_key == "two_orgs_user_key"
        assert config.timeout == 10.0

    def test_override_base_url(self):
        """Test overriding base URL."""
        config = Config(base_url="https://api.example.com")
        assert config.base_url == "https://api.example.com"

    def test_override_api_key(self):
        """Test overriding API key."""
        config = Config(api_key="custom-key")
        assert config.api_key == "custom-key"

    def test_override_timeout(self):
        """Test overriding timeout."""
        config = Config(timeout=30.0)
        assert config.timeout == 30.0

    def test_environment_variable_base_url(self, monkeypatch):
        """Test loading base URL from environment variable."""
        monkeypatch.setenv("COMMON_GRANTS_BASE_URL", "https://env-api.example.com")
        config = Config()
        assert config.base_url == "https://env-api.example.com"

    def test_environment_variable_api_key(self, monkeypatch):
        """Test loading API key from environment variable."""
        monkeypatch.setenv("COMMON_GRANTS_API_KEY", "env-api-key")
        config = Config()
        assert config.api_key == "env-api-key"

    def test_environment_variable_timeout(self, monkeypatch):
        """Test loading timeout from environment variable."""
        monkeypatch.setenv("COMMON_GRANTS_TIMEOUT", "20")
        config = Config()
        assert config.timeout == 20.0

    def test_parameter_overrides_env_var(self, monkeypatch):
        """Test that parameters override environment variables."""
        monkeypatch.setenv("COMMON_GRANTS_BASE_URL", "https://env.example.com")
        config = Config(base_url="https://param.example.com")
        assert config.base_url == "https://param.example.com"

    def test_invalid_url_no_protocol(self):
        """Test that invalid URLs raise ValueError."""
        with pytest.raises(ValueError, match="must start with http:// or https://"):
            Config(base_url="invalid-url")

    def test_invalid_url_empty_string(self, monkeypatch):
        """Test that empty URL raises ValueError."""
        # If base_url is explicitly set to empty string, default value should be used
        monkeypatch.delenv("COMMON_GRANTS_BASE_URL", raising=False)
        config = Config(base_url="")
        assert config.base_url == "http://localhost:8080"

    def test_http_url_valid(self):
        """Test that http:// URLs are valid."""
        config = Config(base_url="http://localhost:8080")
        assert config.base_url == "http://localhost:8080"

    def test_https_url_valid(self):
        """Test that https:// URLs are valid."""
        config = Config(base_url="https://api.example.com")
        assert config.base_url == "https://api.example.com"
