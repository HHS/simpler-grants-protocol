"""Tests for the Opportunity namespace."""

import json
import pytest
from datetime import datetime, UTC
from unittest.mock import Mock
from uuid import uuid4

import httpx
from pydantic import ValidationError

from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.schemas.pydantic.models import OpportunityBase
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.responses import (
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
)
from common_grants_sdk.schemas.pydantic.models.opp_status import OppStatusOptions
from common_grants_sdk.extensions.specs import CustomFieldSpec


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
        "customFields": {
            "legacyId": {"name": "legacyId", "fieldType": "integer", "value": 12345}
        },
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


@pytest.fixture
def sample_search_response(sample_opportunity_data):
    """Create sample search response."""
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
        "sortInfo": {
            "sortBy": "lastModifiedAt",
            "sortOrder": "desc",
            "customSortBy": None,
            "errors": [],
        },
        "filterInfo": {"filters": {}, "errors": []},
    }


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
    # Update opportunity's http reference
    client.opportunity.http = mock_httpx_client
    return client


class TestOpportunityGet:
    """Tests for Opportunity.get()."""

    def test_get_opportunity_success(
        self, client, mock_httpx_client, sample_opportunity_response
    ):
        """Test successfully getting an opportunity."""
        opp_id = uuid4()
        # Update the response with the actual opp_id
        sample_opportunity_response["data"]["id"] = str(opp_id)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_opportunity_response)
        mock_response.json = Mock(return_value=sample_opportunity_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        opp = client.opportunity.get(opp_id)
        assert isinstance(opp, OpportunityBase)
        assert str(opp.id) == str(opp_id)

        # Verify request was made correctly
        expected_url = f"https://api.example.com/common-grants/opportunities/{opp_id}"
        mock_httpx_client.get.assert_called_once()
        call_args = mock_httpx_client.get.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["headers"]["X-API-Key"] == "test-key"
        assert call_args[1]["headers"]["Accept"] == "application/json"

    def test_get_opportunity_with_string_id(
        self, client, mock_httpx_client, sample_opportunity_response
    ):
        """Test getting an opportunity with string ID."""
        opp_id = uuid4()
        opp_id_str = str(opp_id)
        sample_opportunity_response["data"]["id"] = opp_id_str

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_opportunity_response)
        mock_response.json = Mock(return_value=sample_opportunity_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
        }

        opp_base = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportuntiy"
        )
        opp = client.opportunity.get(opp_id_str, schema=opp_base)
        assert isinstance(opp, opp_base)
        assert str(opp.id) == opp_id_str
        assert opp.custom_fields.legacy_id.value == 12345

    def test_get_opportunity_404(self, client, mock_httpx_client):
        """Test getting an opportunity that doesn't exist."""
        opp_id = uuid4()
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
            client.opportunity.get(opp_id)
        assert exc_info.value.error.status == 404

    def test_get_opportunity_401(self, client, mock_httpx_client):
        """Test getting an opportunity with authentication error."""
        opp_id = uuid4()
        error_data = {"status": 401, "message": "Unauthorized", "errors": []}
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = json.dumps(error_data)
        mock_response.json = Mock(return_value=error_data)
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Unauthorized", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.get(opp_id)
        assert exc_info.value.error.status == 401

    def test_get_opportunity_500(self, client, mock_httpx_client):
        """Test getting an opportunity with server error."""
        opp_id = uuid4()
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
            client.opportunity.get(opp_id)
        assert exc_info.value.error.status == 500

    def test_get_opportunity_invalid_response(self, client, mock_httpx_client):
        """Test getting an opportunity with invalid response format."""
        opp_id = uuid4()
        # Valid JSON but doesn't match OpportunityResponse schema
        invalid_data = {"invalid": "data"}
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(invalid_data)
        mock_response.json = Mock(return_value=invalid_data)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(ValidationError):
            client.opportunity.get(opp_id)

    def test_get_opportunity_request_error(self, client, mock_httpx_client):
        """Test getting an opportunity with request error."""
        opp_id = uuid4()
        mock_httpx_client.get = Mock(side_effect=httpx.RequestError("Connection error"))

        with pytest.raises(APIError) as exc_info:
            client.opportunity.get(opp_id)
        assert exc_info.value.error.status == 0
        assert "Connection error" in exc_info.value.error.message


class TestOpportunityList:
    """Tests for Opportunity.list()."""

    def test_list_opportunities_success(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test successfully listing opportunities."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
        }

        opp_base = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportuntiy"
        )

        response = client.opportunity.list(page=1, schema=opp_base)

        assert isinstance(response, OpportunitiesListResponse)
        assert len(response.items) == 2
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_items == 2
        assert response.pagination_info.total_pages == 1
        assert response.items[0].get_custom_field_value("legacy_id", int) == 12345

        # Verify request was made correctly
        expected_url = "https://api.example.com/common-grants/opportunities"
        mock_httpx_client.get.assert_called_once()
        call_args = mock_httpx_client.get.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["headers"]["X-API-Key"] == "test-key"
        assert call_args[1]["headers"]["Accept"] == "application/json"
        assert call_args[1]["params"]["page"] == 1
        assert call_args[1]["params"]["pageSize"] == 100

    def test_list_opportunities_different_page(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test listing opportunities on a different page."""
        sample_list_response["paginationInfo"]["page"] = 2
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = client.opportunity.list(page=2)
        assert response.pagination_info.page == 2

        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["page"] == 2

    def test_list_opportunities_custom_page_size(self, mock_httpx_client):
        """Test listing opportunities with custom page size from config."""
        auth = Auth.api_key("test-key")
        config = Config(
            base_url="https://api.example.com",
            api_key="test-key",
            page_size=50,
        )
        client = Client(config=config, auth=auth)
        client.http = mock_httpx_client
        client.opportunity.http = mock_httpx_client

        sample_response = {
            "status": 200,
            "message": "Success",
            "items": [],
            "paginationInfo": {
                "page": 1,
                "pageSize": 50,
                "totalItems": 0,
                "totalPages": 1,
            },
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_response)
        mock_response.json = Mock(return_value=sample_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        client.opportunity.list(page=1)
        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 50

    def test_list_opportunities_with_page_size_parameter(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test listing opportunities with page_size parameter overriding config."""
        sample_list_response["paginationInfo"]["pageSize"] = 25
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        client.opportunity.list(page=1, page_size=25)
        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 25

    def test_list_opportunities_with_page_size_none(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test listing opportunities with page_size=None uses config default."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        client.opportunity.list(page=1, page_size=None)
        call_args = mock_httpx_client.get.call_args
        assert call_args[1]["params"]["pageSize"] == 100  # config default

    def test_list_opportunities_with_page_size_zero(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test listing opportunities with page_size=0 falls back to config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        client.opportunity.list(page=1, page_size=0)
        call_args = mock_httpx_client.get.call_args
        assert (
            call_args[1]["params"]["pageSize"] == 100
        )  # config default (page_size < 1)

    def test_list_opportunities_with_page_size_negative(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test listing opportunities with negative page_size falls back to config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        client.opportunity.list(page=1, page_size=-1)
        call_args = mock_httpx_client.get.call_args
        assert (
            call_args[1]["params"]["pageSize"] == 100
        )  # config default (page_size < 1)

    def test_list_opportunities_404(self, client, mock_httpx_client):
        """Test listing opportunities with 404 error."""
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
            client.opportunity.list(page=1)
        assert exc_info.value.error.status == 404

    def test_list_opportunities_401(self, client, mock_httpx_client):
        """Test listing opportunities with authentication error."""
        error_data = {"status": 401, "message": "Unauthorized", "errors": []}
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = json.dumps(error_data)
        mock_response.json = Mock(return_value=error_data)
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Unauthorized", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.list(page=1)
        assert exc_info.value.error.status == 401

    def test_list_opportunities_validation_error(self, client, mock_httpx_client):
        """Test listing opportunities with validation error."""
        # Valid JSON but doesn't match OpportunitiesListResponse schema
        invalid_data = {"invalid": "data"}
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(invalid_data)
        mock_response.json = Mock(return_value=invalid_data)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        with pytest.raises(ValidationError):
            client.opportunity.list(page=1)

    def test_list_opportunities_request_error(self, client, mock_httpx_client):
        """Test listing opportunities with request error."""
        mock_httpx_client.get = Mock(side_effect=httpx.RequestError("Connection error"))

        with pytest.raises(APIError) as exc_info:
            client.opportunity.list(page=1)
        assert exc_info.value.error.status == 0
        assert "Connection error" in exc_info.value.error.message

    def test_list_all_opportunities_single_page(
        self, client, mock_httpx_client, sample_list_response
    ):
        """Test fetching all opportunities when there's only one page."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_list_response)
        mock_response.json = Mock(return_value=sample_list_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = client.opportunity.list(page=None)
        assert isinstance(response, OpportunitiesListResponse)
        assert len(response.items) == 2
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        # When fetching all, pagination info should reflect aggregated result
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_items == 2
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.page_size == 2

        # Verify request was made correctly
        expected_url = "https://api.example.com/common-grants/opportunities"
        mock_httpx_client.get.assert_called_once()
        call_args = mock_httpx_client.get.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["params"]["page"] == 1
        assert call_args[1]["params"]["pageSize"] == 100

    def test_list_all_opportunities_multiple_pages(
        self, client, mock_httpx_client, sample_opportunity_data
    ):
        """Test fetching all opportunities across multiple pages."""
        # Create responses for 3 pages
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 2,
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
            "items": [sample_opportunity_data] * 2,
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
            "items": [sample_opportunity_data],
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
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page1_response)
                mock_resp.json = Mock(return_value=page1_response)
            elif page == 2:
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page2_response)
                mock_resp.json = Mock(return_value=page2_response)
            else:  # page == 3
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page3_response)
                mock_resp.json = Mock(return_value=page3_response)
            return mock_resp

        mock_httpx_client.get = Mock(side_effect=mock_get)

        response = client.opportunity.list(page=None)
        assert isinstance(response, OpportunitiesListResponse)
        # Should have all 5 items from all 3 pages
        assert len(response.items) == 5
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        # Pagination info should reflect aggregated result
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_items == 5
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.page_size == 5

        # Verify all 3 pages were requested
        assert mock_httpx_client.get.call_count == 3
        calls = mock_httpx_client.get.call_args_list
        assert calls[0][1]["params"]["page"] == 1
        assert calls[1][1]["params"]["page"] == 2
        assert calls[2][1]["params"]["page"] == 3

    def test_list_all_opportunities_with_custom_page_size(
        self, client, mock_httpx_client, sample_opportunity_data
    ):
        """Test fetching all opportunities with custom page_size."""
        # Create responses for 2 pages with page_size=3
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 3,
            "paginationInfo": {
                "page": 1,
                "pageSize": 3,
                "totalItems": 4,
                "totalPages": 2,
            },
        }
        page2_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data],
            "paginationInfo": {
                "page": 2,
                "pageSize": 3,
                "totalItems": 4,
                "totalPages": 2,
            },
        }

        def mock_get(*args, **kwargs):
            page = kwargs.get("params", {}).get("page", 1)
            mock_resp = Mock()
            mock_resp.raise_for_status = Mock()
            if page == 1:
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page1_response)
                mock_resp.json = Mock(return_value=page1_response)
            else:  # page == 2
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page2_response)
                mock_resp.json = Mock(return_value=page2_response)
            return mock_resp

        mock_httpx_client.get = Mock(side_effect=mock_get)

        response = client.opportunity.list(page=None, page_size=3)
        assert isinstance(response, OpportunitiesListResponse)
        assert len(response.items) == 4
        assert response.pagination_info.page_size == 4

        # Verify page_size parameter was used
        calls = mock_httpx_client.get.call_args_list
        assert calls[0][1]["params"]["pageSize"] == 3
        assert calls[1][1]["params"]["pageSize"] == 3

    def test_list_all_opportunities_empty_result(self, client, mock_httpx_client):
        """Test fetching all opportunities when there are no results."""
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
        mock_response.text = json.dumps(empty_response)
        mock_response.json = Mock(return_value=empty_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.get = Mock(return_value=mock_response)

        response = client.opportunity.list(page=None)
        assert isinstance(response, OpportunitiesListResponse)
        assert len(response.items) == 0
        assert response.pagination_info.total_items == 0
        assert response.pagination_info.total_pages == 1

    def test_list_all_opportunities_error_on_first_page(
        self, client, mock_httpx_client
    ):
        """Test error handling when fetching all opportunities fails on first page."""
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
            client.opportunity.list(page=None)
        assert exc_info.value.error.status == 500

    def test_list_all_opportunities_error_on_subsequent_page(
        self, client, mock_httpx_client, sample_opportunity_data
    ):
        """Test error handling when fetching all opportunities fails on a subsequent page."""
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 2,
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
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page1_response)
                mock_resp.json = Mock(return_value=page1_response)
                mock_resp.raise_for_status = Mock()
                return mock_resp
            else:
                return error_response

        mock_httpx_client.get = Mock(side_effect=mock_get)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.list(page=None)
        assert exc_info.value.error.status == 500


class TestOpportunitySearch:
    """Tests for Opportunity.search()"""

    def test_search_opportunities_success(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test successful search of opportunities."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)
        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
        }

        opp_base = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportuntiy"
        )

        response = client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], schema=opp_base
        )

        assert isinstance(response, OpportunitiesSearchResponse)
        assert len(response.items) == 2
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        assert response.items[0].get_custom_field_value("legacy_id", int) == 12345

        expected_url = "https://api.example.com/common-grants/opportunities/search"
        mock_httpx_client.post.assert_called_once()
        call_args = mock_httpx_client.post.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["headers"]["X-API-Key"] == "test-key"
        assert call_args[1]["headers"]["Accept"] == "application/json"
        assert call_args[1]["params"]["page"] == 1
        assert call_args[1]["params"]["pageSize"] == 100

    def test_search_opportunities_different_page(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test searching opportunities on a different page."""
        sample_search_response["paginationInfo"]["page"] = 2
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        response = client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=2
        )
        assert response.pagination_info.page == 2

    def test_search_opportunities_custom_page_size(self, mock_httpx_client):
        """Test searching opportunities with custom page size from config."""
        auth = Auth.api_key("test-key")
        config = Config(
            base_url="https://api.example.com",
            api_key="test-key",
            page_size=50,
        )
        client = Client(config=config, auth=auth)
        client.http = mock_httpx_client
        client.opportunity.http = mock_httpx_client

        sample_response = {
            "status": 200,
            "message": "Success",
            "items": [],
            "paginationInfo": {
                "page": 1,
                "pageSize": 50,
                "totalItems": 0,
                "totalPages": 1,
            },
            "sortInfo": {
                "sortBy": "lastModifiedAt",
                "sortOrder": "desc",
                "customSortBy": None,
                "errors": [],
            },
            "filterInfo": {"filters": {}, "errors": []},
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_response)
        mock_response.json = Mock(return_value=sample_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=1
        )
        call_args = mock_httpx_client.post.call_args
        assert call_args[1]["params"]["pageSize"] == 50

    def test_search_opportunities_with_page_size_parameter(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test searching opportunities with page_size parameter overriding config."""
        sample_search_response["paginationInfo"]["pageSize"] = 25
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=1, page_size=25
        )
        call_args = mock_httpx_client.post.call_args
        assert call_args[1]["params"]["pageSize"] == 25

    def test_search_opportunities_with_page_size_none(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test searching opportunities with page_size=None uses config default."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=1, page_size=None
        )
        call_args = mock_httpx_client.post.call_args
        assert call_args[1]["params"]["pageSize"] == 100

    def test_search_opportunities_with_page_size_zero(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test searching opportunities with page_size=0 falls back to config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=1, page_size=0
        )
        call_args = mock_httpx_client.post.call_args
        assert (
            call_args[1]["params"]["pageSize"] == 100
        )  # config default (page_size < 1)

    def test_search_opportunities_with_page_size_negative(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test searching opportunities with negative page_size falls back to config."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=1, page_size=-1
        )
        call_args = mock_httpx_client.post.call_args
        assert (
            call_args[1]["params"]["pageSize"] == 100
        )  # config default (page_size < 1)

    def test_search_opportunities_404(self, client, mock_httpx_client):
        """Test searching opportunities with 404 error."""
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
        mock_httpx_client.post = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.search(
                search="local", status=[OppStatusOptions.OPEN], page=1
            )
        assert exc_info.value.error.status == 404

    def test_search_opportunities_401(self, client, mock_httpx_client):
        """Test searching opportunities with authentication error."""
        error_data = {"status": 401, "message": "Unauthorized", "errors": []}
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = json.dumps(error_data)
        mock_response.json = Mock(return_value=error_data)
        mock_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "Unauthorized", request=Mock(), response=mock_response
            )
        )
        mock_httpx_client.post = Mock(return_value=mock_response)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.search(
                search="local", status=[OppStatusOptions.OPEN], page=1
            )
        assert exc_info.value.error.status == 401

    def test_search_opportunities_validation_error(self, client, mock_httpx_client):
        """Test searching opportunities with validation error."""
        # Valid JSON but doesn't match OpportunitiesListResponse schema
        invalid_data = {"invalid": "data"}
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(invalid_data)
        mock_response.json = Mock(return_value=invalid_data)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        with pytest.raises(ValidationError):
            client.opportunity.search(
                search="local", status=[OppStatusOptions.OPEN], page=1
            )

    def test_search_opportunities_request_error(self, client, mock_httpx_client):
        """Test searching opportunities with request error."""
        mock_httpx_client.post = Mock(
            side_effect=httpx.RequestError("Connection error")
        )

        with pytest.raises(APIError) as exc_info:
            client.opportunity.search(
                search="local", status=[OppStatusOptions.OPEN], page=1
            )
        assert exc_info.value.error.status == 0
        assert "Connection error" in exc_info.value.error.message

    def test_search_all_opportunities_single_page(
        self, client, mock_httpx_client, sample_search_response
    ):
        """Test fetching all opportunities when there's only one page."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(sample_search_response)
        mock_response.json = Mock(return_value=sample_search_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        response = client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=None
        )
        assert isinstance(response, OpportunitiesSearchResponse)
        assert len(response.items) == 2
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        # When fetching all, pagination info should reflect aggregated result
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_items == 2
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.page_size == 2

        # Verify request was made correctly
        expected_url = "https://api.example.com/common-grants/opportunities/search"
        mock_httpx_client.post.assert_called_once()
        call_args = mock_httpx_client.post.call_args
        assert call_args[0][0] == expected_url
        assert call_args[1]["params"]["page"] == 1
        assert call_args[1]["params"]["pageSize"] == 100

    def test_list_all_opportunities_multiple_pages(
        self, client, mock_httpx_client, sample_opportunity_data
    ):
        """Test fetching all opportunities across multiple pages."""
        # Create responses for 3 pages
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 2,
            "paginationInfo": {
                "page": 1,
                "pageSize": 2,
                "totalItems": 5,
                "totalPages": 3,
            },
            "sortInfo": {
                "sortBy": "lastModifiedAt",
                "sortOrder": "desc",
                "customSortBy": None,
                "errors": [],
            },
            "filterInfo": {"filters": {}, "errors": []},
        }
        page2_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 2,
            "paginationInfo": {
                "page": 2,
                "pageSize": 2,
                "totalItems": 5,
                "totalPages": 3,
            },
            "sortInfo": {
                "sortBy": "lastModifiedAt",
                "sortOrder": "desc",
                "customSortBy": None,
                "errors": [],
            },
            "filterInfo": {"filters": {}, "errors": []},
        }
        page3_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data],
            "paginationInfo": {
                "page": 3,
                "pageSize": 2,
                "totalItems": 5,
                "totalPages": 3,
            },
            "sortInfo": {
                "sortBy": "lastModifiedAt",
                "sortOrder": "desc",
                "customSortBy": None,
                "errors": [],
            },
            "filterInfo": {"filters": {}, "errors": []},
        }

        def mock_post(*args, **kwargs):
            page = kwargs.get("params", {}).get("page", 1)
            mock_resp = Mock()
            mock_resp.raise_for_status = Mock()
            if page == 1:
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page1_response)
                mock_resp.json = Mock(return_value=page1_response)
            elif page == 2:
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page2_response)
                mock_resp.json = Mock(return_value=page2_response)
            else:  # page == 3
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page3_response)
                mock_resp.json = Mock(return_value=page3_response)
            return mock_resp

        mock_httpx_client.post = Mock(side_effect=mock_post)

        response = client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=None
        )
        assert isinstance(response, OpportunitiesSearchResponse)
        # Should have all 5 items from all 3 pages
        assert len(response.items) == 5
        assert all(isinstance(item, OpportunityBase) for item in response.items)
        # Pagination info should reflect aggregated result
        assert response.pagination_info.page == 1
        assert response.pagination_info.total_items == 5
        assert response.pagination_info.total_pages == 1
        assert response.pagination_info.page_size == 5

        # Verify all 3 pages were requested
        assert mock_httpx_client.post.call_count == 3
        calls = mock_httpx_client.post.call_args_list
        assert calls[0][1]["params"]["page"] == 1
        assert calls[1][1]["params"]["page"] == 2
        assert calls[2][1]["params"]["page"] == 3

    def test_search_all_opportunities_empty_result(self, client, mock_httpx_client):
        """Test fetching all opportunities when there are no results."""
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
            "sortInfo": {
                "sortBy": "lastModifiedAt",
                "sortOrder": "desc",
                "customSortBy": None,
                "errors": [],
            },
            "filterInfo": {"filters": {}, "errors": []},
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = json.dumps(empty_response)
        mock_response.json = Mock(return_value=empty_response)
        mock_response.raise_for_status = Mock()
        mock_httpx_client.post = Mock(return_value=mock_response)

        response = client.opportunity.search(
            search="local", status=[OppStatusOptions.OPEN], page=None
        )
        assert isinstance(response, OpportunitiesSearchResponse)
        assert len(response.items) == 0
        assert response.pagination_info.total_items == 0
        assert response.pagination_info.total_pages == 1

    def test_search_all_opportunities_error_on_subsequent_page(
        self, client, mock_httpx_client, sample_opportunity_data
    ):
        """Test error handling when fetching all opportunities fails on a subsequent page."""
        page1_response = {
            "status": 200,
            "message": "Success",
            "items": [sample_opportunity_data] * 2,
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
                mock_resp.status_code = 200
                mock_resp.text = json.dumps(page1_response)
                mock_resp.json = Mock(return_value=page1_response)
                mock_resp.raise_for_status = Mock()
                return mock_resp
            else:
                return error_response

        mock_httpx_client.post = Mock(side_effect=mock_post)

        with pytest.raises(APIError) as exc_info:
            client.opportunity.search(
                search="local", status=[OppStatusOptions.OPEN], page=None
            )
        assert exc_info.value.error.status == 500
