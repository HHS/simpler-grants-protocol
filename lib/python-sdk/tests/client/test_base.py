"""Tests for the BaseResource class."""

import json
import pytest
from unittest.mock import Mock
from uuid import uuid4

import httpx

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.base import BaseResource
from common_grants_sdk.client.config import Config
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.schemas.pydantic.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.pydantic.responses import Paginated
from pydantic import ValidationError


class MockResource(BaseResource):
    """Mock resource class for testing BaseResource."""

    def __init__(self, client: "Client"):
        """Initialize the mock resource."""
        super().__init__(client, "/test-resource")


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx client."""
    return Mock(spec=httpx.Client)


@pytest.fixture
def client(mock_httpx_client):
    """Create a Client instance with mocked HTTP client."""
    auth = Auth.api_key("test-key")
    config = Config(
        base_url="https://api.example.com", api_key="test-key", timeout=10.0
    )
    client = Client(config=config, auth=auth)
    client.http = mock_httpx_client
    return client


@pytest.fixture
def base_resource(client):
    """Create a BaseResource instance for testing."""
    return MockResource(client)


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


class TestBaseResourceInit:
    """Tests for BaseResource.__init__()."""

    def test_init_sets_client_and_path(self, client):
        """Test that __init__ sets client and path correctly."""
        resource = MockResource(client)
        assert resource.client == client
        assert resource.path == "/test-resource"


class TestBaseResourceList:
    """Tests for BaseResource.list()."""

    def test_list_with_page_calls_list_some(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that list(page=1) calls _list_some()."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource.list(page=1)

        assert isinstance(response, Paginated)
        assert response.status == 200
        assert response.message == "Success"
        assert len(response.items) == 2
        assert isinstance(response.pagination_info, PaginatedResultsInfo)
        assert response.pagination_info.page == 1

    def test_list_without_page_calls_list_all(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that list(page=None) calls _list_all()."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource.list(page=None)

        assert isinstance(response, Paginated)
        assert len(response.items) == 2
        assert isinstance(response.pagination_info, PaginatedResultsInfo)
        # When fetching all, pagination should be aggregated
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_pages == 1

    def test_list_uses_default_page_size(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that list() uses default page_size from config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        base_resource.list(page=1)

        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_list_with_custom_page_size(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that list() accepts custom page_size."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        base_resource.list(page=1, page_size=25)

        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 25

    def test_list_handles_http_error(self, base_resource, mock_httpx_client):
        """Test that list() raises APIError on HTTP errors."""
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
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            base_resource.list(page=1)
        assert exc_info.value.error.status == 404

    def test_list_handles_network_error(self, base_resource, mock_httpx_client):
        """Test that list() raises APIError on network errors."""
        mock_httpx_client.get = Mock(side_effect=httpx.RequestError("Connection error"))

        with pytest.raises(APIError) as exc_info:
            base_resource.list(page=1)
        assert exc_info.value.error.status == 0
        assert "Connection error" in exc_info.value.error.message


class TestBaseResourceListSome:
    """Tests for BaseResource._list_some()."""

    def test_list_some_returns_paginated(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that _list_some() returns Paginated instance."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource._list_some(page=1)

        assert isinstance(response, Paginated)
        assert isinstance(response.items, list)
        assert isinstance(response.pagination_info, PaginatedResultsInfo)
        assert len(response.items) == 2
        assert response.items[0]["name"] == "Test Item"

    def test_list_some_handles_empty_items(self, base_resource, mock_httpx_client):
        """Test that _list_some() handles empty items list."""
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
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=empty_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource._list_some(page=1)

        assert len(response.items) == 0
        assert response.pagination_info.total_items == 0

    def test_list_some_handles_missing_items(self, base_resource, mock_httpx_client):
        """Test that _list_some() raises ValidationError when items field is missing."""
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
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=response_without_items)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        # Paginated requires items field, so missing items should raise ValidationError
        with pytest.raises(ValidationError):
            base_resource._list_some(page=1)

    def test_list_some_uses_config_page_size_when_none(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that _list_some() uses config page_size when page_size is None."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        base_resource._list_some(page=1, page_size=None)

        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 100  # Default from config

    def test_list_some_falls_back_to_config_for_invalid_page_size(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test that _list_some() falls back to config for invalid page_size."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        base_resource._list_some(page=1, page_size=0)

        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 100  # Falls back to config


class TestBaseResourceListAll:
    """Tests for BaseResource._list_all()."""

    def test_list_all_single_page(
        self, base_resource, mock_httpx_client, sample_list_response
    ):
        """Test _list_all() when there's only one page."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource._list_all()

        assert len(response.items) == 2
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.total_items == 2

    def test_list_all_multiple_pages(
        self, base_resource, mock_httpx_client, sample_item_data
    ):
        """Test _list_all() when there are multiple pages."""
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

        mock_httpx_client.get = Mock(side_effect=mock_get)

        response = base_resource._list_all()

        assert len(response.items) == 5  # 2 + 2 + 1
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.total_items == 5

    def test_list_all_empty_result(self, base_resource, mock_httpx_client):
        """Test _list_all() when there are no items."""
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
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=empty_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource._list_all()

        assert len(response.items) == 0
        assert response.pagination_info.total_items == 0
        assert (
            response.pagination_info.page_size == 100
        )  # Uses config default when empty

    def test_list_all_handles_error_on_first_page(
        self, base_resource, mock_httpx_client
    ):
        """Test _list_all() error handling on first page."""
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
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            base_resource._list_all()
        assert exc_info.value.error.status == 500

    def test_list_all_handles_error_on_subsequent_page(
        self, base_resource, mock_httpx_client, sample_item_data
    ):
        """Test _list_all() error handling on subsequent page."""
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

        mock_httpx_client.get = Mock(side_effect=mock_get)

        with pytest.raises(APIError) as exc_info:
            base_resource._list_all()
        assert exc_info.value.error.status == 500


class TestBaseResourceGet:
    """Tests for BaseResource.get()."""

    def test_get_returns_correct_tuple(
        self, base_resource, mock_httpx_client, sample_get_response
    ):
        """Test that get() returns SuccessResponse with correct structure."""
        from common_grants_sdk.client.base import SuccessResponse

        item_id = uuid4()
        sample_get_response["data"]["id"] = str(item_id)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_get_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource.get(item_id)

        assert isinstance(response, SuccessResponse)
        assert response.status == 200
        assert response.message == "Success"
        assert isinstance(response.data, dict)
        assert response.data["name"] == "Test Item"
        assert response.data["id"] == str(item_id)

    def test_get_with_string_id(
        self, base_resource, mock_httpx_client, sample_get_response
    ):
        """Test that get() accepts string IDs."""
        item_id = "test-id-123"
        sample_get_response["data"]["id"] = item_id

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_get_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource.get(item_id)

        assert response.data["id"] == item_id
        # Verify URL construction
        call_args = mock_httpx_client.get.call_args
        assert f"/test-resource/{item_id}" in call_args[0][0]

    def test_get_handles_missing_data(self, base_resource, mock_httpx_client):
        """Test that get() handles missing data field."""
        response_without_data = {
            "status": 200,
            "message": "Success",
        }
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=response_without_data)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = base_resource.get(uuid4())

        assert response.data == {}  # Should default to empty dict

    def test_get_handles_http_error(self, base_resource, mock_httpx_client):
        """Test that get() raises APIError on HTTP errors."""
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
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            base_resource.get(item_id)
        assert exc_info.value.error.status == 404

    def test_get_handles_network_error(self, base_resource, mock_httpx_client):
        """Test that get() raises APIError on network errors."""
        item_id = uuid4()
        mock_httpx_client.get = Mock(side_effect=httpx.RequestError("Connection error"))

        with pytest.raises(APIError) as exc_info:
            base_resource.get(item_id)
        assert exc_info.value.error.status == 0
        assert "Connection error" in exc_info.value.error.message

    def test_get_constructs_correct_url(
        self, base_resource, mock_httpx_client, sample_get_response
    ):
        """Test that get() constructs the correct URL."""
        item_id = uuid4()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json = Mock(return_value=sample_get_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        base_resource.get(item_id)

        call_args = mock_httpx_client.get.call_args
        expected_url = f"https://api.example.com/test-resource/{item_id}"
        assert call_args[0][0] == expected_url
