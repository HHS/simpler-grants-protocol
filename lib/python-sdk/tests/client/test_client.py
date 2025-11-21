"""Tests for the Client class."""

import json
import pytest
from unittest.mock import Mock, patch
from uuid import uuid4

import httpx

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.schemas.pydantic.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.pydantic.responses import Paginated
from pydantic import ValidationError


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

    def test_list_all_items_respects_limit(self):
        """Test that list_all_items respects list_items_limit and stops early."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            # Set a small limit for testing
            config = Config(
                base_url="https://api.example.com",
                api_key="test-key",
                list_items_limit=5,
            )
            client = Client(config=config)

            # Create sample item data
            sample_item = {"id": str(uuid4()), "name": "Test Item", "value": 42}

            # Create responses with more items than the limit
            # Page 1: 3 items, Page 2: 3 items, Page 3: 3 items (total 9, but limit is 5)
            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 3,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 3,
                    "totalItems": 9,
                    "totalPages": 3,
                },
            }
            page2_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 3,
                "paginationInfo": {
                    "page": 2,
                    "pageSize": 3,
                    "totalItems": 9,
                    "totalPages": 3,
                },
            }
            page3_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 3,
                "paginationInfo": {
                    "page": 3,
                    "pageSize": 3,
                    "totalItems": 9,
                    "totalPages": 3,
                },
            }

            call_count = 0

            def mock_get(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                page = kwargs.get("params", {}).get("page", 1)
                mock_resp = Mock()
                mock_resp.raise_for_status = Mock()
                if page == 1:
                    mock_resp.json = Mock(return_value=page1_response)
                elif page == 2:
                    mock_resp.json = Mock(return_value=page2_response)
                else:  # page == 3
                    mock_resp.json = Mock(return_value=page3_response)
                return mock_resp

            client.get = Mock(side_effect=mock_get)

            # Call list_all_items
            response = client.list_all_items("/test-path")

            # Should only have 5 items (the limit), not 9
            assert len(response.items) == 5
            assert response.pagination_info.total_items == 5
            # Should have stopped after page 2 (3 + 3 = 6, but trimmed to 5)
            # So it should have called get twice (page 1 and page 2)
            assert call_count == 2

    def test_list_all_items_trims_items_to_limit(self):
        """Test that list_all_items trims items array to the limit."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            # Set limit to 3
            config = Config(
                base_url="https://api.example.com",
                api_key="test-key",
                list_items_limit=3,
            )
            client = Client(config=config)

            sample_item = {"id": str(uuid4()), "name": "Test Item", "value": 42}

            # Single page with 5 items, but limit is 3
            page_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 5,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 5,
                    "totalItems": 5,
                    "totalPages": 1,
                },
            }

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=page_response)
            client.get = Mock(return_value=mock_response)

            response = client.list_all_items("/test-path")

            # Should be trimmed to 3 items
            assert len(response.items) == 3
            assert response.pagination_info.total_items == 3

    def test_list_all_items_stops_at_exact_limit(self):
        """Test that list_all_items stops when limit is reached exactly."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            # Set limit to 4
            config = Config(
                base_url="https://api.example.com",
                api_key="test-key",
                list_items_limit=4,
            )
            client = Client(config=config)

            sample_item = {"id": str(uuid4()), "name": "Test Item", "value": 42}

            # Page 1: 2 items, Page 2: 2 items (exactly 4, the limit)
            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 2,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 2,
                    "totalItems": 6,
                    "totalPages": 3,
                },
            }
            page2_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item] * 2,
                "paginationInfo": {
                    "page": 2,
                    "pageSize": 2,
                    "totalItems": 6,
                    "totalPages": 3,
                },
            }

            call_count = 0

            def mock_get(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                page = kwargs.get("params", {}).get("page", 1)
                mock_resp = Mock()
                mock_resp.raise_for_status = Mock()
                if page == 1:
                    mock_resp.json = Mock(return_value=page1_response)
                else:
                    mock_resp.json = Mock(return_value=page2_response)
                return mock_resp

            client.get = Mock(side_effect=mock_get)

            response = client.list_all_items("/test-path")

            # Should have exactly 4 items
            assert len(response.items) == 4
            assert response.pagination_info.total_items == 4
            # Should have stopped after page 2 (2 + 2 = 4, exactly the limit)
            assert call_count == 2


@pytest.fixture
def sample_item_data():
    """Create sample item data for testing."""
    return {
        "id": str(uuid4()),
        "name": "Test Item",
        "value": 42,
    }


@pytest.fixture
def sample_list_response(sample_item_data):
    """Create sample list response."""
    return {
        "status": 200,
        "message": "Success",
        "items": [sample_item_data, sample_item_data],
        "paginationInfo": {
            "page": 1,
            "pageSize": 100,
            "totalItems": 2,
            "totalPages": 1,
        },
    }


@pytest.fixture
def sample_get_response(sample_item_data):
    """Create sample get response."""
    return {
        "status": 200,
        "message": "Success",
        "data": sample_item_data,
    }


@pytest.fixture
def sample_search_response(sample_item_data):
    """Create sample search response."""
    return {
        "status": 200,
        "message": "Success",
        "items": [sample_item_data, sample_item_data],
        "paginationInfo": {
            "page": 1,
            "pageSize": 100,
            "totalItems": 2,
            "totalPages": 1,
        },
    }


@pytest.fixture
def search_request():
    request = {
        "filters": {
            "closeDateRange": {
                "operator": "between",
                "value": {"max": "2025-12-31", "min": "2025-01-01"},
            },
            "status": {"operator": "in", "value": ["open", "forecasted"]},
            "totalFundingAvailableRange": {
                "operator": "between",
                "value": {
                    "max": {"amount": "1000000", "currency": "USD"},
                    "min": {"amount": "10000", "currency": "USD"},
                },
            },
        },
        "pagination": {"page": 1, "pageSize": 10},
        "search": "local",
        "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
    }

    return request


class TestClientList:
    """Tests for Client.list() method."""

    def test_list_with_page_calls_list_some_items(self, sample_list_response):
        """Test that list(path, page=1) calls list_some_items()."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path", page=1)

            assert isinstance(response, Paginated)
            assert response.status == 200
            assert response.message == "Success"
            assert len(response.items) == 2
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            assert response.pagination_info.page == 1

    def test_list_without_page_calls_list_all_items(self, sample_list_response):
        """Test that list(path, page=None) calls list_all_items()."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path", page=None)

            assert isinstance(response, Paginated)
            assert len(response.items) == 2
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            # When fetching all, pagination should be aggregated
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1

    def test_list_uses_default_page_size(self, sample_list_response):
        """Test that list() uses default page_size from config."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            client.list("/test-path", page=1)

            call_args = client.get.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_list_with_custom_page_size(self, sample_list_response):
        """Test that list() accepts custom page_size."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            client.list("/test-path", page=1, page_size=25)

            call_args = client.get.call_args
            assert call_args[1]["params"]["pageSize"] == 25

    def test_list_handles_http_error(self):
        """Test that list() raises APIError on HTTP errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            error_data = {"status": 404, "message": "Not found", "errors": []}
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = json.dumps(error_data)
            mock_response.json = Mock(return_value=error_data)
            mock_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Not found", request=Mock(), response=mock_response
                )
            )
            client.get = Mock(return_value=mock_response)

            with pytest.raises(APIError) as exc_info:
                client.list("/test-path", page=1)
            assert exc_info.value.error.status == 404

    def test_list_handles_network_error(self):
        """Test that list() raises APIError on network errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            client.get = Mock(side_effect=httpx.RequestError("Connection error"))

            with pytest.raises(APIError) as exc_info:
                client.list("/test-path", page=1)
            assert exc_info.value.error.status == 0
            assert "Connection error" in exc_info.value.error.message


class TestClientListSomeItems:
    """Tests for Client.list_some_items() via Client.list()."""

    def test_list_some_returns_paginated(self, sample_list_response):
        """Test that list(path, page=1) returns Paginated instance."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path", page=1)

            assert isinstance(response, Paginated)
            assert isinstance(response.items, list)
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            assert len(response.items) == 2
            assert response.items[0]["name"] == "Test Item"

    def test_list_some_handles_empty_items(self):
        """Test that list(path, page=1) handles empty items list."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            empty_response = {
                "status": 200,
                "message": "Success",
                "items": [],
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=empty_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path", page=1)

            assert len(response.items) == 0
            assert response.pagination_info.total_items == 0

    def test_list_some_handles_missing_items(self):
        """Test that list(path, page=1) raises ValidationError when items field is missing."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            response_without_items = {
                "status": 200,
                "message": "Success",
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=response_without_items)
            client.get = Mock(return_value=mock_response)

            # Paginated requires items field, so missing items should raise ValidationError
            with pytest.raises(ValidationError):
                client.list("/test-path", page=1)

    def test_list_some_uses_config_page_size_when_none(self, sample_list_response):
        """Test that list(path, page=1) uses config page_size when page_size is None."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            client.list("/test-path", page=1, page_size=None)

            call_args = client.get.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_list_some_falls_back_to_config_for_invalid_page_size(
        self, sample_list_response
    ):
        """Test that list(path, page=1) falls back to config for invalid page_size."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            client.list("/test-path", page=1, page_size=0)

            call_args = client.get.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Falls back to config


class TestClientListAllItems:
    """Tests for Client.list_all_items() via Client.list()."""

    def test_list_all_single_page(self, sample_list_response):
        """Test list(path) when there's only one page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_list_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path")

            assert len(response.items) == 2
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1
            assert response.pagination_info.total_items == 2

    def test_list_all_multiple_pages(self, sample_item_data):
        """Test list(path) when there are multiple pages."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            page2_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 2,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            page3_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data],
                "paginationInfo": {
                    "page": 3,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }

            def mock_get(*args, **kwargs):
                page = kwargs.get("params", {}).get("page", 1)
                mock_resp = Mock()
                mock_resp.raise_for_status = Mock()
                if page == 1:
                    mock_resp.json = Mock(return_value=page1_response)
                elif page == 2:
                    mock_resp.json = Mock(return_value=page2_response)
                else:  # page == 3
                    mock_resp.json = Mock(return_value=page3_response)
                return mock_resp

            client.get = Mock(side_effect=mock_get)

            response = client.list("/test-path")

            assert len(response.items) == 5  # 2 + 2 + 1
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1
            assert response.pagination_info.total_items == 5

    def test_list_all_empty_result(self):
        """Test list(path) when there are no items."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            empty_response = {
                "status": 200,
                "message": "Success",
                "items": [],
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=empty_response)
            client.get = Mock(return_value=mock_response)

            response = client.list("/test-path")

            assert len(response.items) == 0
            assert response.pagination_info.total_items == 0
            assert (
                response.pagination_info.page_size == 100
            )  # Uses config default when empty

    def test_list_all_handles_error_on_first_page(self):
        """Test list(path) error handling on first page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            error_data = {"status": 500, "message": "Server error", "errors": []}
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = json.dumps(error_data)
            mock_response.json = Mock(return_value=error_data)
            mock_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Server error", request=Mock(), response=mock_response
                )
            )
            client.get = Mock(return_value=mock_response)

            with pytest.raises(APIError) as exc_info:
                client.list("/test-path")
            assert exc_info.value.error.status == 500

    def test_list_all_handles_error_on_subsequent_page(self, sample_item_data):
        """Test list(path) error handling on subsequent page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            error_data = {"status": 500, "message": "Server error", "errors": []}
            error_response = Mock()
            error_response.status_code = 500
            error_response.text = json.dumps(error_data)
            error_response.json = Mock(return_value=error_data)
            error_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Server error", request=Mock(), response=error_response
                )
            )

            def mock_get(*args, **kwargs):
                page = kwargs.get("params", {}).get("page", 1)
                if page == 1:
                    mock_resp = Mock()
                    mock_resp.raise_for_status = Mock()
                    mock_resp.json = Mock(return_value=page1_response)
                    return mock_resp
                else:
                    return error_response

            client.get = Mock(side_effect=mock_get)

            with pytest.raises(APIError) as exc_info:
                client.list("/test-path")
            assert exc_info.value.error.status == 500


class TestClientGetItem:
    """Tests for Client.get_item() method."""

    def test_get_item_returns_success_response(self, sample_get_response):
        """Test that get_item() returns SuccessResponse with correct structure."""
        from common_grants_sdk.client.response import SuccessResponse

        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            item_id = uuid4()
            sample_get_response["data"]["id"] = str(item_id)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_get_response)
            client.get = Mock(return_value=mock_response)

            response = client.get_item("/test-path", item_id)

            assert isinstance(response, SuccessResponse)
            assert response.status == 200
            assert response.message == "Success"
            assert isinstance(response.data, dict)
            assert response.data["name"] == "Test Item"
            assert response.data["id"] == str(item_id)

    def test_get_item_with_string_id(self, sample_get_response):
        """Test that get_item() accepts string IDs."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            item_id = "test-id-123"
            sample_get_response["data"]["id"] = item_id

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_get_response)
            client.get = Mock(return_value=mock_response)

            response = client.get_item("/test-path", item_id)

            assert response.data["id"] == item_id
            # Verify URL construction
            call_args = client.get.call_args
            assert f"/test-path/{item_id}" in call_args[0][0]

    def test_get_item_handles_missing_data(self):
        """Test that get_item() handles missing data field."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            response_without_data = {
                "status": 200,
                "message": "Success",
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=response_without_data)
            client.get = Mock(return_value=mock_response)

            response = client.get_item("/test-path", uuid4())

            assert response.data == {}  # Should default to empty dict

    def test_get_item_handles_http_error(self):
        """Test that get_item() raises APIError on HTTP errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            item_id = uuid4()
            error_data = {"status": 404, "message": "Not found", "errors": []}
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = json.dumps(error_data)
            mock_response.json = Mock(return_value=error_data)
            mock_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Not found", request=Mock(), response=mock_response
                )
            )
            client.get = Mock(return_value=mock_response)

            with pytest.raises(APIError) as exc_info:
                client.get_item("/test-path", item_id)
            assert exc_info.value.error.status == 404

    def test_get_item_handles_network_error(self):
        """Test that get_item() raises APIError on network errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            item_id = uuid4()
            client.get = Mock(side_effect=httpx.RequestError("Connection error"))

            with pytest.raises(APIError) as exc_info:
                client.get_item("/test-path", item_id)
            assert exc_info.value.error.status == 0
            assert "Connection error" in exc_info.value.error.message

    def test_get_item_constructs_correct_url(self, sample_get_response):
        """Test that get_item() constructs the correct path."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            item_id = uuid4()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_get_response)
            client.get = Mock(return_value=mock_response)

            client.get_item("/test-path", item_id)

            call_args = client.get.call_args
            expected_path = f"/test-path/{item_id}"
            assert call_args[0][0] == expected_path


class TestClientSearch:
    """Tests for Client.search() method."""

    def test_search_with_page_calls_list_some_items(self, sample_search_response):
        """Test that search(path, search, page=1) calls search()."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            response = client.search("/test-path", request_data=search_request, page=1)

            assert isinstance(response, Paginated)
            assert response.status == 200
            assert response.message == "Success"
            assert len(response.items) == 2
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            assert response.pagination_info.page == 1

    def test_search_without_page_calls_list_all_items(self, sample_search_response):
        """Test that search(path, search, page=None) calls search_all_items()."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            response = client.search(
                "/test-path", request_data=search_request, page=None
            )

            assert isinstance(response, Paginated)
            assert len(response.items) == 2
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            # When fetching all, pagination should be aggregated
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1

    def test_search_uses_default_page_size(self, sample_search_response):
        """Test that search() uses default page_size from config."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            client.search("/test-path", request_data=search_request, page=1)

            call_args = client.post.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_search_with_custom_page_size(self, sample_search_response):
        """Test that search() accepts custom page_size."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            client.search(
                "/test-path", request_data=search_request, page=1, page_size=25
            )

            call_args = client.post.call_args
            assert call_args[1]["params"]["pageSize"] == 25

    def test_search_handles_http_error(self, search_request):
        """Test that search() raises APIError on HTTP errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            error_data = {"status": 404, "message": "Not found", "errors": []}
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = json.dumps(error_data)
            mock_response.json = Mock(return_value=error_data)
            mock_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Not found", request=Mock(), response=mock_response
                )
            )
            client.post = Mock(return_value=mock_response)

            with pytest.raises(APIError) as exc_info:
                client.search("/test-path", request_data=search_request, page=1)
            assert exc_info.value.error.status == 404

    def test_search_handles_network_error(self, search_request):
        """Test that search() raises APIError on network errors."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            client.post = Mock(side_effect=httpx.RequestError("Connection error"))

            with pytest.raises(APIError) as exc_info:
                client.search("/test-path", request_data=search_request, page=1)
            assert exc_info.value.error.status == 0
            assert "Connection error" in exc_info.value.error.message


class TestClientSearchSomeItems:
    """Tests for Client.search_some_items() via Client.search()"""

    def test_search_some_returns_paginated(self, sample_search_response):
        """Test that search(path, request, page=1) returns Paginated instance."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            response = client.search("/test-path", request_data=search_request, page=1)

            assert isinstance(response, Paginated)
            assert isinstance(response.items, list)
            assert isinstance(response.pagination_info, PaginatedResultsInfo)
            assert len(response.items) == 2
            assert response.items[0]["name"] == "Test Item"

    def test_search_some_handles_empty_items(self):
        """Test that search(path, request, page=1) handles empty items list."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            empty_response = {
                "status": 200,
                "message": "Success",
                "items": [],
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=empty_response)
            client.post = Mock(return_value=mock_response)

            response = client.search("/test-path", request_data=search_request, page=1)

            assert len(response.items) == 0
            assert response.pagination_info.total_items == 0

    def test_search_some_handles_missing_items(self):
        """Test that search(path, request, page=1) raises ValidationError when items field is missing."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            response_without_items = {
                "status": 200,
                "message": "Success",
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=response_without_items)
            client.post = Mock(return_value=mock_response)

            # Paginated requires items field, so missing items should raise ValidationError
            with pytest.raises(ValidationError):
                client.search("/test-path", request_data=search_request, page=1)

    def test_search_some_uses_config_page_size_when_none(self, sample_search_response):
        """Test that search(path, request, page=1) uses config page_size when page_size is None."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            client.search(
                "/test-path", request_data=search_request, page=1, page_size=None
            )

            call_args = client.post.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_search_some_falls_back_to_config_for_invalid_page_size(
        self, sample_search_response
    ):
        """Test that search(path, request, page=1) falls back to config for invalid page_size."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            client.search(
                "/test-path", request_data=search_request, page=1, page_size=0
            )

            call_args = client.post.call_args
            assert call_args[1]["params"]["pageSize"] == 100  # Falls back to config


class TestClientSearchAllItems:
    """Tests for Client.search_all_items() via Client.search()"""

    def test_search_all_single_page(self, sample_search_response):
        """Test search(path, request) when there's only one page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=sample_search_response)
            client.post = Mock(return_value=mock_response)

            response = client.search("/test-path", request_data=search_request)

            assert len(response.items) == 2
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1
            assert response.pagination_info.total_items == 2

    def test_search_all_multiple_pages(self, sample_item_data):
        """Test search(path, request) when there are multiple pages."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            page2_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 2,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            page3_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data],
                "paginationInfo": {
                    "page": 3,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }

            def mock_post(*args, **kwargs):
                page = kwargs.get("params", {}).get("page", 1)
                mock_resp = Mock()
                mock_resp.raise_for_status = Mock()
                if page == 1:
                    mock_resp.json = Mock(return_value=page1_response)
                elif page == 2:
                    mock_resp.json = Mock(return_value=page2_response)
                else:  # page == 3
                    mock_resp.json = Mock(return_value=page3_response)
                return mock_resp

            client.post = Mock(side_effect=mock_post)

            response = client.search("/test-path", search_request)

            assert len(response.items) == 5  # 2 + 2 + 1
            assert response.pagination_info.page == 1
            assert response.pagination_info.total_pages == 1
            assert response.pagination_info.total_items == 5

    def test_search_all_empty_result(self):
        """Test search(path, request) when there are no items."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            empty_response = {
                "status": 200,
                "message": "Success",
                "items": [],
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 100,
                    "totalItems": 0,
                    "totalPages": 1,
                },
            }
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=empty_response)
            client.post = Mock(return_value=mock_response)

            response = client.search("/test-path", search_request)

            assert len(response.items) == 0
            assert response.pagination_info.total_items == 0
            assert (
                response.pagination_info.page_size == 100
            )  # Uses config default when empty

    def test_search_all_handles_error_on_first_page(self):
        """Test search(path, request) error handling on first page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            error_data = {"status": 500, "message": "Server error", "errors": []}
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = json.dumps(error_data)
            mock_response.json = Mock(return_value=error_data)
            mock_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Server error", request=Mock(), response=mock_response
                )
            )
            client.post = Mock(return_value=mock_response)

            with pytest.raises(APIError) as exc_info:
                client.search("/test-path", search_request)
            assert exc_info.value.error.status == 500

    def test_search_all_handles_error_on_subsequent_page(self, sample_item_data):
        """Test search(path, request) error handling on subsequent page."""
        with patch("common_grants_sdk.client.client.httpx.Client"):
            config = Config(base_url="https://api.example.com", api_key="test-key")
            client = Client(config=config)

            page1_response = {
                "status": 200,
                "message": "Success",
                "items": [sample_item_data] * 2,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": 2,
                    "totalItems": 5,
                    "totalPages": 3,
                },
            }
            error_data = {"status": 500, "message": "Server error", "errors": []}
            error_response = Mock()
            error_response.status_code = 500
            error_response.text = json.dumps(error_data)
            error_response.json = Mock(return_value=error_data)
            error_response.raise_for_status = Mock(
                side_effect=httpx.HTTPStatusError(
                    "Server error", request=Mock(), response=error_response
                )
            )

            def mock_post(*args, **kwargs):
                page = kwargs.get("params", {}).get("page", 1)
                if page == 1:
                    mock_resp = Mock()
                    mock_resp.raise_for_status = Mock()
                    mock_resp.json = Mock(return_value=page1_response)
                    return mock_resp
                else:
                    return error_response

            client.post = Mock(side_effect=mock_post)

            with pytest.raises(APIError) as exc_info:
                client.search("/test-path", search_request)
            assert exc_info.value.error.status == 500
