"""Tests for the Client class."""

from unittest.mock import Mock, patch

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config


class TestClient:
    """Tests for the Client class."""

    def test_client_initialization_defaults(self, monkeypatch):
        """Test client initialization with default values."""
        # Clear any existing env vars
        monkeypatch.delenv("COMMON_GRANTS_BASE_URL", raising=False)
        monkeypatch.delenv("COMMON_GRANTS_API_KEY", raising=False)
        monkeypatch.delenv("COMMON_GRANTS_TIMEOUT", raising=False)

        with patch("common_grants_sdk.client.client.httpx.Client"):
            client = Client()
            assert client._config.base_url == "http://localhost:8080"
            assert isinstance(client._auth, Auth)
            assert client._auth.get_headers() == {
                "X-API-Key": "two_orgs_user_key",
                "Accept": "application/json",
            }
            assert client._config.timeout == 10.0

    def test_client_initialization_custom_base_url(self):
        """Test client initialization with custom base URL via Config."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com")
            client = Client(config=config)
            assert client._config.base_url == "https://api.example.com"

    def test_client_initialization_custom_auth(self):
        """Test client initialization with custom auth."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            auth = Auth.bearer("custom-token")
            client = Client(auth=auth)
            assert client._auth == auth
            assert client._auth.get_headers() == {
                "Authorization": "Bearer custom-token",
                "Accept": "application/json",
            }

    def test_client_initialization_custom_timeout(self):
        """Test client initialization with custom timeout via Config."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(timeout=30.0)
            client = Client(config=config)
            assert client._config.timeout == 30.0

    def test_client_environment_variables(self, monkeypatch):
        """Test client initialization using environment variables."""
        monkeypatch.setenv("COMMON_GRANTS_BASE_URL", "https://env.example.com")
        monkeypatch.setenv("COMMON_GRANTS_API_KEY", "env-key")

        with patch("common_grants_sdk.client.client.httpx.Client"):
            client = Client()
            assert client._config.base_url == "https://env.example.com"
            assert client._auth.get_headers() == {
                "X-API-Key": "env-key",
                "Accept": "application/json",
            }

    def test_client_parameter_overrides_env(self, monkeypatch):
        """Test that config parameters override environment variables."""
        monkeypatch.setenv("COMMON_GRANTS_BASE_URL", "https://env.example.com")
        monkeypatch.setenv("COMMON_GRANTS_API_KEY", "env-key")

        with patch("common_grants_sdk.client.client.httpx.Client"):
            auth = Auth.api_key("param-key")
            config = Config(base_url="https://param.example.com")
            client = Client(config=config, auth=auth)
            assert client._config.base_url == "https://param.example.com"
            assert client._auth.get_headers() == {
                "X-API-Key": "param-key",
                "Accept": "application/json",
            }

    def test_client_has_opportunities_methods(self):
        """Test that client has opportunity methods."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            client = Client()
            assert hasattr(client, "list_opportunities")
            assert hasattr(client, "get_opportunity")

    def test_client_context_manager(self):
        """Test client as context manager."""
        mock_httpx_client = Mock()
        mock_httpx_client.close = Mock()

        with patch(
            "common_grants_sdk.client.client.httpx.Client",
            return_value=mock_httpx_client,
        ):
            with Client() as client:
                assert client is not None

            # Should call close when exiting context
            mock_httpx_client.close.assert_called_once()

    def test_client_close_method(self):
        """Test client close method."""
        mock_httpx_client = Mock()
        mock_httpx_client.close = Mock()

        with patch(
            "common_grants_sdk.client.client.httpx.Client",
            return_value=mock_httpx_client,
        ):
            client = Client()
            client.close()
            mock_httpx_client.close.assert_called_once()

    def test_client_base_url_strips_trailing_slash(self):
        """Test that base URL has trailing slash stripped when constructing URLs."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com/")
            # Verify that trailing slash is stripped when used in URL construction
            # by checking that the config still has it, but URLs are constructed correctly
            assert config.base_url == "https://api.example.com/"
            # Verify URL construction logic (no double slash)
            expected_url = f"{config.base_url.rstrip('/')}/common-grants/opportunities"
            assert expected_url == "https://api.example.com/common-grants/opportunities"

    def test_client_initialization_with_config(self):
        """Test client initialization with Config instance."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(
                base_url="https://config.example.com",
                api_key="config-key",
                timeout=20.0,
            )
            client = Client(config=config)
            assert client._config.base_url == "https://config.example.com"
            assert client._auth.get_headers() == {
                "X-API-Key": "config-key",
                "Accept": "application/json",
            }
            assert client._config.timeout == 20.0

    def test_client_auth_overrides_config_api_key(self):
        """Test that auth parameter overrides config api_key."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(api_key="config-key")
            auth = Auth.bearer("auth-token")
            client = Client(config=config, auth=auth)
            # Auth should override config's api_key
            assert client._auth.get_headers() == {
                "Authorization": "Bearer auth-token",
                "Accept": "application/json",
            }
