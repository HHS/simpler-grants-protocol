"""Tests for response schemas."""

import pytest
from pydantic import ValidationError
from typing import Optional

from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.pydantic.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.pydantic.responses import (
    DefaultResponse,
    Error,
    Filtered,
    Paginated,
    Sorted,
    Success,
)
from common_grants_sdk.schemas.pydantic.sorting import SortedResultsInfo
from common_grants_sdk.schemas.pydantic.responses import FilterInfo


class TestDefaultResponse:
    """Test DefaultResponse class."""

    def test_default_response_creation(self) -> None:
        """Test creating a DefaultResponse."""
        response = DefaultResponse(status=200, message="Success")
        assert response.status == 200
        assert response.message == "Success"

    def test_default_response_validation(self) -> None:
        """Test DefaultResponse validation."""
        with pytest.raises(ValidationError):
            DefaultResponse()  # type: ignore[call-arg] # Missing required fields
        with pytest.raises(ValidationError):
            DefaultResponse(status=200)  # type: ignore[call-arg] # Missing message
        with pytest.raises(ValidationError):
            DefaultResponse(message="Test")  # type: ignore[call-arg] # Missing status

    def test_default_response_examples(self) -> None:
        """Test DefaultResponse with example values."""
        response = DefaultResponse(
            status=201,
            message="Created successfully",
        )
        assert response.status == 201
        assert response.message == "Created successfully"


class TestSuccess:
    """Test Success class."""

    def test_success_default_values(self) -> None:
        """Test Success with default values."""
        response = Success()
        assert response.status == 200
        assert response.message == "Success"

    def test_success_custom_values(self) -> None:
        """Test Success with custom values."""
        response = Success(status=201, message="Created")
        assert response.status == 201
        assert response.message == "Created"


class TestPaginated:
    """Test Paginated class."""

    def test_paginated_response(self) -> None:
        """Test Paginated response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )

        response = Paginated[dict](
            items=items,
            paginationInfo=pagination_info,
        )

        assert response.status == 200
        assert response.message == "Success"
        assert response.items == items
        assert response.pagination_info == pagination_info

    def test_paginated_with_models(self) -> None:
        """Test Paginated response with models."""

        # Create a simple test model
        class TestModel(CommonGrantsBaseModel):
            id: str
            name: str

        items = [
            TestModel(id="1", name="Item 1"),
            TestModel(id="2", name="Item 2"),
        ]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )

        response = Paginated[TestModel](
            items=items,
            paginationInfo=pagination_info,
        )

        assert len(response.items) == 2
        assert response.items[0].id == "1"
        assert response.items[1].name == "Item 2"


class TestSorted:
    """Test Sorted class."""

    def test_sorted_response(self) -> None:
        """Test Sorted response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )
        sort_info = SortedResultsInfo(
            sortBy="id",
            sortOrder="asc",
        )

        response = Sorted[dict](
            items=items,
            paginationInfo=pagination_info,
            sortInfo=sort_info,
        )

        assert response.status == 200
        assert response.items == items
        assert response.pagination_info == pagination_info
        assert response.sort_info == sort_info


class TestFiltered:
    """Test Filtered class."""

    def test_filtered_response(self) -> None:
        """Test Filtered response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )
        sort_info = SortedResultsInfo(
            sortBy="id",
            sortOrder="asc",
        )
        filter_info = FilterInfo[dict](
            filters={"status": "active"},
            errors=[],
        )

        response = Filtered[dict, dict](
            items=items,
            paginationInfo=pagination_info,
            sortInfo=sort_info,
            filterInfo=filter_info,
        )

        assert response.status == 200
        assert response.items == items
        assert response.pagination_info == pagination_info
        assert response.sort_info == sort_info
        assert response.filter_info == filter_info

    def test_filtered_response_type_safety(self) -> None:
        """Test that FilterT type parameter provides type safety."""
        items = [{"id": "1"}]
        pagination_info = PaginatedResultsInfo(
            page=1, pageSize=10, totalItems=1, totalPages=1
        )
        sort_info = SortedResultsInfo(sortBy="id", sortOrder="asc")

        # Test with a specific filter type
        class StatusFilter(CommonGrantsBaseModel):
            status: str
            category: Optional[str] = None

        filter_info = FilterInfo[StatusFilter](
            filters=StatusFilter(status="active", category="grant"),
            errors=[],
        )

        response = Filtered[dict, StatusFilter](
            items=items,
            paginationInfo=pagination_info,
            sortInfo=sort_info,
            filterInfo=filter_info,
        )

        # Verify that the filter_info has the correct type
        assert isinstance(response.filter_info.filters, StatusFilter)
        assert response.filter_info.filters.status == "active"
        assert response.filter_info.filters.category == "grant"


class TestError:
    """Test Error class."""

    def test_error_default_values(self) -> None:
        """Test Error with default values."""
        response = Error(errors=[])
        assert response.status == 400
        assert response.message == "Error"
        assert response.errors == []

    def test_error_custom_values(self) -> None:
        """Test Error with custom values."""
        errors = [{"field": "name", "message": "Required"}]
        response = Error(
            status=422,
            message="Validation failed",
            errors=errors,
        )
        assert response.status == 422
        assert response.message == "Validation failed"
        assert response.errors == errors

    def test_error_validation(self) -> None:
        """Test Error validation."""
        with pytest.raises(ValidationError):
            Error()  # type: ignore[call-arg] # Missing required errors field
        with pytest.raises(ValidationError):
            Error(status=400, message="Test")  # type: ignore[call-arg] # Missing errors


class TestResponseSerialization:
    """Test response serialization."""

    def test_default_response_serialization(self) -> None:
        """Test DefaultResponse serialization."""
        response = DefaultResponse(status=200, message="Success")
        data = response.model_dump()
        assert data["status"] == 200
        assert data["message"] == "Success"

    def test_success_response_serialization(self) -> None:
        """Test Success response serialization."""
        response = Success()
        data = response.model_dump()
        assert data["status"] == 200
        assert data["message"] == "Success"

    def test_error_response_serialization(self) -> None:
        """Test Error response serialization."""
        response = Error(errors=[{"detail": "Test error"}])
        data = response.model_dump()
        assert data["status"] == 400
        assert data["message"] == "Error"
        assert data["errors"] == [{"detail": "Test error"}]

    def test_paginated_response_serialization(self) -> None:
        """Test Paginated response serialization."""
        items = [{"id": "1"}]
        pagination_info = PaginatedResultsInfo(
            page=1, pageSize=10, totalItems=1, totalPages=1
        )

        response = Paginated[dict](
            items=items,
            paginationInfo=pagination_info,
        )
        data = response.model_dump()

        assert data["status"] == 200
        assert data["message"] == "Success"
        assert data["items"] == items
        assert data["pagination_info"]["page"] == 1
        assert data["pagination_info"]["page_size"] == 10


class TestResponseDeserialization:
    """Test response deserialization."""

    def test_default_response_deserialization(self) -> None:
        """Test DefaultResponse deserialization."""
        data = {"status": 200, "message": "Success"}
        response = DefaultResponse.model_validate(data)
        assert response.status == 200
        assert response.message == "Success"

    def test_success_response_deserialization(self) -> None:
        """Test Success response deserialization."""
        data = {"status": 200, "message": "Success"}
        response = Success.model_validate(data)
        assert response.status == 200
        assert response.message == "Success"

    def test_error_response_deserialization(self) -> None:
        """Test Error response deserialization."""
        data = {
            "status": 400,
            "message": "Error",
            "errors": [{"detail": "Test error"}],
        }
        response = Error.model_validate(data)
        assert response.status == 400
        assert response.message == "Error"
        assert response.errors == [{"detail": "Test error"}]


class TestOpportunityResponses:
    """Opportunity envelopes carry the Core v0.5 identifiers and funders."""

    @staticmethod
    def _payloads() -> dict:
        from tests.schemas.opportunity_v05_fixtures import (
            FULL_OPPORTUNITY,
            MINIMAL_OPPORTUNITY,
        )

        items = [FULL_OPPORTUNITY, MINIMAL_OPPORTUNITY]
        pagination = {"page": 1, "pageSize": 2, "totalItems": 2, "totalPages": 1}
        return {
            "get": {"status": 200, "message": "Success", "data": FULL_OPPORTUNITY},
            "list": {
                "status": 200,
                "message": "Success",
                "items": items,
                "paginationInfo": pagination,
            },
            "search": {
                "status": 200,
                "message": "Success",
                "items": items,
                "paginationInfo": pagination,
                "sortInfo": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
                "filterInfo": {"filters": {}},
            },
        }

    @staticmethod
    def _models() -> dict:
        from common_grants_sdk.schemas import (
            OpportunitiesListResponse,
            OpportunitiesSearchResponse,
            OpportunityResponse,
        )

        return {
            "get": OpportunityResponse,
            "list": OpportunitiesListResponse,
            "search": OpportunitiesSearchResponse,
        }

    @pytest.mark.parametrize("route", ["get", "list", "search"])
    def test_envelope_round_trips_additions(self, route: str) -> None:
        from tests.schemas.opportunity_v05_fixtures import wire

        payload = self._payloads()[route]
        response = self._models()[route].model_validate(payload)

        assert wire(response) == payload

    @pytest.mark.parametrize("route", ["get", "list", "search"])
    def test_envelope_reads_null_addition_as_omitted(self, route: str) -> None:
        from tests.schemas.opportunity_v05_fixtures import FULL_OPPORTUNITY, wire

        payload = self._payloads()[route]
        null_funders = {**FULL_OPPORTUNITY, "funders": None}
        if route == "get":
            payload = {**payload, "data": null_funders}
        else:
            payload = {**payload, "items": [null_funders]}

        response = self._models()[route].model_validate(payload)

        data = wire(response)
        item = data["data"] if route == "get" else data["items"][0]
        assert "funders" not in item

    def test_get_envelope_keeps_detail_awards(self) -> None:
        from common_grants_sdk.schemas import AwdRef, OpportunityDetails
        from tests.schemas.opportunity_v05_fixtures import (
            CLEAN_ENERGY_OPPORTUNITY,
            wire,
        )

        payload = {
            "status": 200,
            "message": "Success",
            "data": CLEAN_ENERGY_OPPORTUNITY,
        }
        response = self._models()["get"].model_validate(payload)

        assert isinstance(response.data, OpportunityDetails)
        assert response.data.awards is not None
        assert all(isinstance(ref, AwdRef) for ref in response.data.awards)
        assert wire(response) == payload

    @pytest.mark.parametrize("route", ["list", "search"])
    def test_collection_envelopes_stay_base_shaped(self, route: str) -> None:
        from common_grants_sdk.schemas import OpportunityDetails
        from tests.schemas.opportunity_v05_fixtures import (
            CLEAN_ENERGY_OPPORTUNITY,
            INVALID_AWARDS,
            wire,
        )

        items = [CLEAN_ENERGY_OPPORTUNITY, INVALID_AWARDS["null awards"]]
        payload = {**self._payloads()[route], "items": items}
        response = self._models()[route].model_validate(payload)

        for item in response.items:
            assert not isinstance(item, OpportunityDetails)
        assert all("awards" not in item for item in wire(response)["items"])

    def test_get_envelope_rejects_null_awards(self) -> None:
        from tests.schemas.opportunity_v05_fixtures import INVALID_AWARDS

        payload = {
            "status": 200,
            "message": "Success",
            "data": INVALID_AWARDS["null awards"],
        }
        with pytest.raises(ValidationError, match="must be omitted, not null"):
            self._models()["get"].model_validate(payload)

    def test_get_envelope_builds_details_from_opportunity_instances(self) -> None:
        from common_grants_sdk.schemas import OpportunityBase, OpportunityDetails
        from tests.schemas.opportunity_v05_fixtures import (
            CLEAN_ENERGY_OPPORTUNITY,
            MINIMAL_OPPORTUNITY,
            OPPORTUNITIES,
            TypedOpportunity,
            wire,
        )

        envelope = self._models()["get"]
        typed = OPPORTUNITIES["custom fields with both additions"]
        for data, payload in (
            (OpportunityBase.model_validate(MINIMAL_OPPORTUNITY), MINIMAL_OPPORTUNITY),
            (TypedOpportunity.model_validate(typed), typed),
            (
                OpportunityDetails.model_validate(CLEAN_ENERGY_OPPORTUNITY),
                CLEAN_ENERGY_OPPORTUNITY,
            ),
        ):
            response = envelope(status=200, message="Success", data=data)

            assert isinstance(response.data, OpportunityDetails)
            # Unset properties stay omitted rather than becoming null.
            assert wire(response)["data"] == payload

    def test_get_envelope_validates_awards_an_instance_supplies(self) -> None:
        from typing import Any, Optional

        from common_grants_sdk.schemas import CustomField, OpportunityBase  # noqa: F401
        from tests.schemas.opportunity_v05_fixtures import (
            AWARD_REFS,
            MINIMAL_OPPORTUNITY,
            wire,
        )

        class LegacyOpportunity(OpportunityBase):
            awards: Optional[Any] = None

        envelope = self._models()["get"]
        kept = LegacyOpportunity.model_validate(
            {**MINIMAL_OPPORTUNITY, "awards": AWARD_REFS}
        )
        response = envelope(status=200, message="Success", data=kept)
        assert wire(response)["data"]["awards"] == AWARD_REFS

        for bad, match in (
            (None, "must be omitted, not null"),
            ([{"id": "not-a-uuid", "title": "Bad"}], "awards.0.id"),
        ):
            data = LegacyOpportunity.model_validate(
                {**MINIMAL_OPPORTUNITY, "awards": bad}
            )
            with pytest.raises(ValidationError, match=match):
                envelope(status=200, message="Success", data=data)

    def test_get_envelope_rejects_malformed_award_references(self) -> None:
        from tests.schemas.opportunity_v05_fixtures import INVALID_AWARDS

        payload = {
            "status": 200,
            "message": "Success",
            "data": INVALID_AWARDS["award missing title"],
        }
        with pytest.raises(ValidationError, match="title"):
            self._models()["get"].model_validate(payload)
