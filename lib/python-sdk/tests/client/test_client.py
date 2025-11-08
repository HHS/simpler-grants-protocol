"""Tests for the Client class."""

from unittest.mock import Mock, patch

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config


class TestClient:
    """Tests for the Client class."""

    def test_client_initialization_with_config_and_auth(self):
        """Test client initialization with config and auth."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            auth = Auth.api_key("test-key")
            client = Client(config=config, auth=auth)
            assert client.config.base_url == "https://api.example.com"
            assert client.auth == auth
            assert isinstance(client.opportunity, type(client.opportunity))

    def test_client_initialization_defaults_auth(self, monkeypatch):
        """Test client initialization with default auth from config."""
        monkeypatch.setenv("CG_API_BASE_URL", "https://api.example.com")
        monkeypatch.setenv("CG_API_KEY", "env-key")

        with patch("common_grants_sdk.client.client.httpx.Client"):
            client = Client()
            assert client.config.base_url == "https://api.example.com"
            assert isinstance(client.auth, Auth)
            assert client.auth.get_headers() == {
                "X-API-Key": "env-key",
                "Accept": "application/json",
            }

    def test_client_initialization_custom_base_url(self):
        """Test client initialization with custom base URL via Config."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)
            assert client.config.base_url == "https://api.example.com"

    def test_client_initialization_custom_auth(self):
        """Test client initialization with custom auth."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            auth = Auth.bearer("custom-token")
            client = Client(config=config, auth=auth)
            assert client.auth == auth
            assert client.auth.get_headers() == {
                "Authorization": "Bearer custom-token",
                "Accept": "application/json",
            }

    def test_client_initialization_custom_timeout(self):
        """Test client initialization with custom timeout via Config."""
        with patch("common_grants_sdk.client.client.httpx.Client") as mock_httpx:
            config = Config(
                base_url="https://api.example.com",
                api_key="test-key",
                timeout=30.0,
            )
            client = Client(config=config)
            assert client.config.timeout == 30.0
            # Verify httpx.Client was called with the timeout
            mock_httpx.assert_called_once_with(timeout=30.0)

    def test_client_environment_variables(self, monkeypatch):
        """Test client initialization using environment variables."""
        monkeypatch.setenv("CG_API_BASE_URL", "https://env.example.com")
        monkeypatch.setenv("CG_API_KEY", "env-key")

        with patch("common_grants_sdk.client.client.httpx.Client"):
            client = Client()
            assert client.config.base_url == "https://env.example.com"
            assert client.auth.get_headers() == {
                "X-API-Key": "env-key",
                "Accept": "application/json",
            }

    def test_client_parameter_overrides_env(self, monkeypatch):
        """Test that config parameters override environment variables."""
        monkeypatch.setenv("CG_API_BASE_URL", "https://env.example.com")
        monkeypatch.setenv("CG_API_KEY", "env-key")

        with patch("common_grants_sdk.client.client.httpx.Client"):
            auth = Auth.api_key("param-key")
            config = Config(base_url="https://param.example.com", api_key="param-key")
            client = Client(config=config, auth=auth)
            assert client.config.base_url == "https://param.example.com"
            assert client.auth.get_headers() == {
                "X-API-Key": "param-key",
                "Accept": "application/json",
            }

    def test_client_has_opportunity_namespace(self):
        """Test that client has opportunity namespace."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)
            assert hasattr(client, "opportunity")
            assert hasattr(client.opportunity, "get")
            assert hasattr(client.opportunity, "list")

    def test_client_context_manager(self):
        """Test client as context manager."""
        mock_httpx_client = Mock()
        mock_httpx_client.close = Mock()

        with patch(
            "common_grants_sdk.client.client.httpx.Client",
            return_value=mock_httpx_client,
        ):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            with Client(config=config) as client:
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
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)
            client.close()
            mock_httpx_client.close.assert_called_once()

    def test_client_url_method(self):
        """Test client URL construction."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)
            url = client.url("/common-grants/opportunities")
            assert url == "https://api.example.com/common-grants/opportunities"

    def test_client_url_strips_trailing_slash(self):
        """Test that base URL has trailing slash stripped when constructing URLs."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com/", api_key="test-key")
            client = Client(config=config)
            url = client.url("/common-grants/opportunities")
            assert url == "https://api.example.com/common-grants/opportunities"

    def test_client_initialization_with_config(self):
        """Test client initialization with Config instance."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(
                base_url="https://config.example.com",
                api_key="config-key",
                timeout=20.0,
            )
            client = Client(config=config)
            assert client.config.base_url == "https://config.example.com"
            assert client.auth.get_headers() == {
                "X-API-Key": "config-key",
                "Accept": "application/json",
            }
            assert client.config.timeout == 20.0

    def test_client_auth_overrides_config_api_key(self):
        """Test that auth parameter overrides config api_key."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="config-key")
            auth = Auth.bearer("auth-token")
            client = Client(config=config, auth=auth)
            # Auth should override config's api_key
            assert client.auth.get_headers() == {
                "Authorization": "Bearer auth-token",
                "Accept": "application/json",
            }
