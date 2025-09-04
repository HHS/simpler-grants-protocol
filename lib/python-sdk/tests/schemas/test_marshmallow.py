"""Tests for the new Marshmallow schemas."""

import pytest
from marshmallow import ValidationError

from common_grants_sdk.schemas.marshmallow.generated_schema import (
    # Basic field types
    Money,
    # Field models
    EventType,
    # Model models
    OppStatusOptions,
    OppStatus,
    OppFunding,
    # Filter models
    StringArrayFilter,
    DateRangeFilter,
    # Pagination models
    PaginatedQueryParams,
    PaginatedResultsInfo,
    # Sorting models
    SortOrder,
    SortQueryParams,
    SortedResultsInfo,
    # Request models
    OpportunitySearchRequest,
    # Response models
    Success,
    OpportunitiesListResponse,
    # Error response models
    Error,
)


def test_imports():
    """Test that all the new schemas can be imported."""
    # This test passes if the imports above don't raise ImportError
    assert True


def test_money_schema_validation():
    """Test Money schema validation."""
    money_schema = Money()

    # Valid data
    money_data = {"amount": "1000.00", "currency": "USD"}
    result = money_schema.load(money_data)
    assert result["amount"] == "1000.00"
    assert result["currency"] == "USD"

    # Test with negative amount
    money_data = {"amount": "-500.00", "currency": "EUR"}
    result = money_schema.load(money_data)
    assert result["amount"] == "-500.00"
    assert result["currency"] == "EUR"


def test_opp_status_schema_validation():
    """Test OppStatus schema validation."""
    status_schema = OppStatus()

    # Valid data
    status_data = {"value": "open", "description": "Open for applications"}
    result = status_schema.load(status_data)
    assert result["value"] == "open"
    assert result["description"] == "Open for applications"

    # Test without optional description
    status_data = {"value": "closed"}
    result = status_schema.load(status_data)
    assert result["value"] == "closed"
    assert "description" not in result


def test_opp_funding_schema_validation():
    """Test OppFunding schema validation."""
    funding_schema = OppFunding()

    # Valid data
    funding_data = {
        "details": "Federal grant funding",
        "minAwardAmount": {"amount": "50000", "currency": "USD"},
        "maxAwardAmount": {"amount": "500000", "currency": "USD"},
        "estimatedAwardCount": 10,
    }
    result = funding_schema.load(funding_data)
    assert result["details"] == "Federal grant funding"
    assert result["minAwardAmount"]["amount"] == "50000"
    assert result["maxAwardAmount"]["amount"] == "500000"
    assert result["estimatedAwardCount"] == 10


def test_enum_fields():
    """Test that enum fields work correctly."""
    # Test OppStatusOptions
    status_options = OppStatusOptions()
    valid_status = status_options.deserialize("open")
    assert valid_status == "open"

    # Test EventType
    event_type = EventType()
    valid_event_type = event_type.deserialize("singleDate")
    assert valid_event_type == "singleDate"

    # Test SortOrder
    sort_order = SortOrder()
    valid_sort_order = sort_order.deserialize("asc")
    assert valid_sort_order == "asc"


def test_enum_invalid_values():
    """Test that enum fields reject invalid values."""
    # Test OppStatusOptions with invalid value
    status_options = OppStatusOptions()
    with pytest.raises(ValidationError):
        status_options.deserialize("invalid_status")

    # Test EventType with invalid value
    event_type = EventType()
    with pytest.raises(ValidationError):
        event_type.deserialize("invalid_event_type")

    # Test SortOrder with invalid value
    sort_order = SortOrder()
    with pytest.raises(ValidationError):
        sort_order.deserialize("invalid_sort_order")


def test_money_validation_errors():
    """Test Money schema validation errors."""
    money_schema = Money()

    # Missing required fields
    with pytest.raises(ValidationError):
        money_schema.load({"amount": "1000.00"})  # Missing currency

    with pytest.raises(ValidationError):
        money_schema.load({"currency": "USD"})  # Missing amount


def test_opp_status_validation_errors():
    """Test OppStatus schema validation errors."""
    status_schema = OppStatus()

    # Test that the schema accepts valid data
    valid_data = {"value": "open", "description": "Some description"}
    result = status_schema.load(valid_data)
    assert result["value"] == "open"
    assert result["description"] == "Some description"

    # Test that the schema accepts custom values
    custom_data = {"customValue": "custom_status", "description": "Custom status"}
    result = status_schema.load(custom_data)
    assert result["customValue"] == "custom_status"
    assert result["description"] == "Custom status"


def test_opportunity_search_request():
    """Test OpportunitySearchRequest schema."""
    request_schema = OpportunitySearchRequest()

    # Valid search request
    search_data = {
        "search": "research grant",
        "filters": {
            "status": {"operator": "in", "value": ["open"]},
            "totalFundingAvailableRange": {
                "operator": "between",
                "value": {
                    "min": {"amount": "10000", "currency": "USD"},
                    "max": {"amount": "100000", "currency": "USD"},
                },
            },
        },
        "pagination": {"page": 1, "pageSize": 10},
        "sorting": {"sortBy": "title", "sortOrder": "asc"},
    }

    result = request_schema.load(search_data)
    assert result["search"] == "research grant"
    assert result["filters"]["status"]["value"] == ["open"]
    assert result["pagination"]["page"] == 1
    assert result["sorting"]["sortBy"] == "title"


def test_pagination_schemas():
    """Test pagination schemas."""
    # Test PaginatedQueryParams
    query_params_schema = PaginatedQueryParams()
    query_data = {"page": 2, "pageSize": 20}
    result = query_params_schema.load(query_data)
    assert result["page"] == 2
    assert result["pageSize"] == 20

    # Test PaginatedResultsInfo
    results_info_schema = PaginatedResultsInfo()
    info_data = {"page": 1, "pageSize": 10, "totalItems": 100, "totalPages": 10}
    result = results_info_schema.load(info_data)
    assert result["page"] == 1
    assert result["totalItems"] == 100
    assert result["totalPages"] == 10


def test_sorting_schemas():
    """Test sorting schemas."""
    # Test SortQueryParams
    sort_query_schema = SortQueryParams()
    sort_data = {"sortBy": "title", "sortOrder": "desc"}
    result = sort_query_schema.load(sort_data)
    assert result["sortBy"] == "title"
    assert result["sortOrder"] == "desc"

    # Test SortedResultsInfo
    sorted_info_schema = SortedResultsInfo()
    info_data = {"sortBy": "createdAt", "sortOrder": "asc"}
    result = sorted_info_schema.load(info_data)
    assert result["sortBy"] == "createdAt"
    assert result["sortOrder"] == "asc"


def test_filter_schemas():
    """Test filter schemas."""
    # Test StringArrayFilter
    string_array_filter = StringArrayFilter()
    filter_data = {"operator": "in", "value": ["open", "closed"]}
    result = string_array_filter.load(filter_data)
    assert result["operator"] == "in"
    assert result["value"] == ["open", "closed"]

    # Test DateRangeFilter
    date_range_filter = DateRangeFilter()
    filter_data = {
        "operator": "between",
        "value": {"min": "2024-01-01", "max": "2024-12-31"},
    }
    result = date_range_filter.load(filter_data)
    assert result["operator"] == "between"
    assert result["value"]["min"] == "2024-01-01"
    assert result["value"]["max"] == "2024-12-31"


def test_response_schemas():
    """Test response schemas."""
    # Test Success response
    success_schema = Success()
    response_data = {"message": "Operation successful"}
    result = success_schema.load(response_data)
    assert result["message"] == "Operation successful"

    # Test Error response
    error_schema = Error()
    error_data = {
        "status": 400,
        "message": "Invalid input",
        "errors": ["Validation failed"],
    }
    result = error_schema.load(error_data)
    assert result["status"] == 400
    assert result["message"] == "Invalid input"
    assert result["errors"] == ["Validation failed"]


def test_opportunity_response_schemas():
    """Test opportunity response schemas."""
    # Test OpportunitiesListResponse
    list_response_schema = OpportunitiesListResponse()
    response_data = {
        "status": 200,
        "message": "Success",
        "items": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Test Opportunity",
                "description": "Test description",
                "status": {"value": "open"},
            }
        ],
        "paginationInfo": {"page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1},
    }
    result = list_response_schema.load(response_data)
    assert result["status"] == 200
    assert result["message"] == "Success"
    assert len(result["items"]) == 1
    assert result["items"][0]["title"] == "Test Opportunity"
    assert result["paginationInfo"]["totalItems"] == 1
