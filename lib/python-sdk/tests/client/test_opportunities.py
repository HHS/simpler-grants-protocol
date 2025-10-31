"""Tests for the OpportunitiesResource and iterator."""

import pytest
from datetime import datetime, UTC
from unittest.mock import Mock
from uuid import uuid4

import httpx
from pydantic import ValidationError

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


@pytest.fixture
def sample_opportunity_data():
    """Create sample opportunity data for testing."""
    opp_id = uuid4()
    return {
        "id": str(opp_id),
        "title": "Test Opportunity",
        "description": "Test description",
        "status": {"value": "open", "description": "Open"},
        "createdAt": datetime.now(UTC).isoformat(),
        "lastModifiedAt": datetime.now(UTC).isoformat(),
    }


@pytest.fixture
def sample_opportunity_response(sample_opportunity_data):
    """Create sample opportunity response."""
    return {
        "status": 200,
        "message": "Success",
        "data": sample_opportunity_data,
    }


@pytest.fixture
def sample_list_response(sample_opportunity_data):
    """Create sample list response."""
    return {
        "status": 200,
        "message": "Success",
        "items": [sample_opportunity_data, sample_opportunity_data],
        "paginationInfo": {
            "page": 1,
            "pageSize": 100,
            "totalItems": 2,
            "totalPages": 1,
        },
    }


class TestOpportunitiesResource:
    """Tests for OpportunitiesResource."""

    @pytest.fixture
    def mock_httpx_client(self):
        """Create a mock httpx client."""
        return Mock(spec=httpx.Client)

    @pytest.fixture
    def client(self, mock_httpx_client):
        """Create a Client instance."""
        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client
        return client

    def test_get_opportunity_success(
        self, client, mock_httpx_client, sample_opportunity_response
    ):
        """Test successfully getting an opportunity."""
        import json

        opp_id = uuid4()
        # Update the response with the actual opp_id
        sample_opportunity_response["data"]["id"] = str(opp_id)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_opportunity_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        opp = client.get_opportunity(opp_id)
        assert isinstance(opp, OpportunityBase)
        assert str(opp.id) == str(opp_id)

        # Verify request was made correctly
        expected_url = f"https://api.example.com/common-grants/opportunities/{opp_id}"
        mock_httpx_client.get.assert_called_once()
        call_args = mock_httpx_client.get.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["headers"]["X-API-Key"] == "test-key"
        assert call_args[1]["headers"]["Accept"] == "application/json"

    def test_get_opportunity_404(self, client, mock_httpx_client):
        """Test getting an opportunity that doesn't exist."""
        opp_id = uuid4()
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.text = '{"status": 404, "message": "Not found"}'
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Not found", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            client.get_opportunity(opp_id)
        assert exc_info.value.response.status_code == 404

    def test_get_opportunity_401(self, client, mock_httpx_client):
        """Test getting an opportunity with authentication error."""
        opp_id = uuid4()
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = '{"status": 401, "message": "Unauthorized"}'
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Unauthorized", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            client.get_opportunity(opp_id)
        assert exc_info.value.response.status_code == 401

    def test_get_opportunity_500(self, client, mock_httpx_client):
        """Test getting an opportunity with server error."""
        opp_id = uuid4()
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = '{"status": 500, "message": "Server error"}'
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Server error", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            client.get_opportunity(opp_id)
        assert exc_info.value.response.status_code == 500

    def test_get_opportunity_invalid_response(self, client, mock_httpx_client):
        """Test getting an opportunity with invalid response format."""
        opp_id = uuid4()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "invalid json"
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(ValidationError):
            client.get_opportunity(opp_id)

    def test_get_opportunity_request_error(self, client, mock_httpx_client):
        """Test getting an opportunity with request error."""
        opp_id = uuid4()
        mock_httpx_client.get = Mock(side_effect=httpx.RequestError("Connection error"))

        with pytest.raises(httpx.RequestError):
            client.get_opportunity(opp_id)

    def test_list_page_size_validation(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test that page_size > PAGE_SIZE_MAX is capped to PAGE_SIZE_MAX."""
        import json

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        # Should not raise an error, but cap the page_size
        iterator = client.list_opportunities(page_size=101)
        list(iterator.iter_items())

        # Verify request was made with capped page_size
        mock_httpx_client.get.assert_called_once()
        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == Config.PAGE_SIZE_MAX


class TestOpportunitiesListIterator:
    """Tests for OpportunitiesListIterator."""

    @pytest.fixture
    def mock_httpx_client(self):
        """Create a mock httpx client."""
        return Mock(spec=httpx.Client)

    def test_iter_items_single_page(self, mock_httpx_client, sample_list_response):
        """Test iterating over a single page of opportunities."""
        import json

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client
        iterator = client.list_opportunities(paginate=False)
        items = list(iterator.iter_items())

        assert len(items) == 2
        assert all(isinstance(item, OpportunityBase) for item in items)

        # Should only make one request
        assert mock_httpx_client.get.call_count == 1

    def test_iter_items_pagination(self, mock_httpx_client):
        """Test iterating with automatic pagination."""
        import json

        # First page response
        now = datetime.now(UTC).isoformat()
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [
                {
                    "id": str(uuid4()),
                    "title": "Opp 1",
                    "description": "Desc 1",
                    "status": {"value": "open"},
                    "createdAt": now,
                    "lastModifiedAt": now,
                }
            ],
            "paginationInfo": {
                "page": 1,
                "pageSize": 1,
                "totalItems": 2,
                "totalPages": 2,
            },
        }

        # Second page response
        page2_response = {
            "status": 200,
            "message": "Success",
            "items": [
                {
                    "id": str(uuid4()),
                    "title": "Opp 2",
                    "description": "Desc 2",
                    "status": {"value": "open"},
                    "createdAt": now,
                    "lastModifiedAt": now,
                }
            ],
            "paginationInfo": {
                "page": 2,
                "pageSize": 1,
                "totalItems": 2,
                "totalPages": 2,
            },
        }

        mock_responses = [
            Mock(
                status_code=200,
                text=json.dumps(page1_response),
                raise_for_status=Mock(),
            ),
            Mock(
                status_code=200,
                text=json.dumps(page2_response),
                raise_for_status=Mock(),
            ),
        ]
        mock_httpx_client.get = Mock(side_effect=mock_responses)

        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client

        iterator = client.list_opportunities(paginate=True, page_size=1)
        items = list(iterator.iter_items())

        assert len(items) == 2
        assert all(isinstance(item, OpportunityBase) for item in items)

        # Should make two requests (one per page)
        # Note: might be more due to how iterator checks for next page
        assert mock_httpx_client.get.call_count >= 2

    def test_iter_items_total_limit(self, mock_httpx_client):
        """Test iterating with total limit."""
        import json

        now = datetime.now(UTC).isoformat()
        page_response = {
            "status": 200,
            "message": "Success",
            "items": [
                {
                    "id": str(uuid4()),
                    "title": f"Opp {i}",
                    "description": f"Desc {i}",
                    "status": {"value": "open"},
                    "createdAt": now,
                    "lastModifiedAt": now,
                }
                for i in range(3)
            ],
            "paginationInfo": {
                "page": 1,
                "pageSize": 3,
                "totalItems": 10,
                "totalPages": 4,
            },
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(page_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client

        iterator = client.list_opportunities(paginate=True, total=2)
        items = list(iterator.iter_items())

        assert len(items) == 2
        # Should stop after getting 2 items even though there are more available

    def test_iter_items_authentication_error(self, mock_httpx_client):
        """Test iterator handles authentication errors."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = '{"status": 401, "message": "Unauthorized"}'
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Unauthorized", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client

        iterator = client.list_opportunities()

        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            list(iterator.iter_items())
        assert exc_info.value.response.status_code == 401

    def test_iter_items_validation_error(self, mock_httpx_client):
        """Test iterator handles validation errors."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "invalid json"
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        auth = Auth.api_key("test-key")
        config = Config(base_url="https://api.example.com", timeout=10.0)
        client = Client(config=config, auth=auth)
        client._http_client = mock_httpx_client

        iterator = client.list_opportunities()

        with pytest.raises(ValidationError):
            list(iterator.iter_items())
