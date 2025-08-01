"""Tests for sorting schemas."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import OppSortBy, OppSorting, SortedResultsInfo


class TestOppSortBy:
    """Test OppSortBy enum."""

    def test_enum_values(self):
        """Test that all expected enum values are present."""
        assert OppSortBy.LAST_MODIFIED_AT == "lastModifiedAt"
        assert OppSortBy.CREATED_AT == "createdAt"
        assert OppSortBy.TITLE == "title"
        assert OppSortBy.STATUS == "status.value"
        assert OppSortBy.CLOSE_DATE == "keyDates.closeDate"
        assert OppSortBy.MAX_AWARD_AMOUNT == "funding.maxAwardAmount"
        assert OppSortBy.MIN_AWARD_AMOUNT == "funding.minAwardAmount"
        assert OppSortBy.TOTAL_FUNDING_AVAILABLE == "funding.totalAmountAvailable"
        assert OppSortBy.ESTIMATED_AWARD_COUNT == "funding.estimatedAwardCount"
        assert OppSortBy.CUSTOM == "custom"

    def test_enum_iteration(self):
        """Test that enum can be iterated over."""
        values = list(OppSortBy)
        assert len(values) == 10
        assert "lastModifiedAt" in [v.value for v in values]
        assert "custom" in [v.value for v in values]


class TestOppSorting:
    """Test OppSorting class."""

    def test_required_fields(self):
        """Test OppSorting with required fields."""
        sorting = OppSorting(
            sort_by=OppSortBy.TITLE,
        )
        assert sorting.sort_by == OppSortBy.TITLE
        assert sorting.sort_order == "desc"  # default value
        assert sorting.custom_sort_by is None

    def test_with_all_fields(self):
        """Test OppSorting with all fields specified."""
        sorting = OppSorting(
            sort_by=OppSortBy.LAST_MODIFIED_AT,
            sort_order="asc",
            custom_sort_by=None,
        )
        assert sorting.sort_by == OppSortBy.LAST_MODIFIED_AT
        assert sorting.sort_order == "asc"
        assert sorting.custom_sort_by is None

    def test_custom_sort_by_required_when_sort_by_is_custom(self):
        """Test that custom_sort_by is required when sort_by is CUSTOM."""
        with pytest.raises(ValidationError) as exc_info:
            OppSorting(
                sort_by=OppSortBy.CUSTOM,
                sort_order="desc",
            )
        assert "customSortBy is required when sortBy is 'custom'" in str(exc_info.value)

    def test_custom_sort_by_with_custom_sort_by(self):
        """Test that custom_sort_by works when sort_by is CUSTOM."""
        sorting = OppSorting(
            sort_by=OppSortBy.CUSTOM,
            sort_order="asc",
            custom_sort_by="customField",
        )
        assert sorting.sort_by == OppSortBy.CUSTOM
        assert sorting.sort_order == "asc"
        assert sorting.custom_sort_by == "customField"

    def test_json_serialization(self):
        """Test JSON serialization with aliases."""
        sorting = OppSorting(
            sort_by=OppSortBy.LAST_MODIFIED_AT,
            sort_order="desc",
            custom_sort_by="customField",
        )
        data = sorting.model_dump(by_alias=True)
        assert data["sortBy"] == "lastModifiedAt"
        assert data["sortOrder"] == "desc"
        assert data["customSortBy"] == "customField"

    def test_json_deserialization(self):
        """Test JSON deserialization with aliases."""
        data = {
            "sortBy": "title",
            "sortOrder": "asc",
            "customSortBy": None,
        }
        sorting = OppSorting.model_validate(data)
        assert sorting.sort_by == OppSortBy.TITLE
        assert sorting.sort_order == "asc"
        assert sorting.custom_sort_by is None

    def test_model_validation(self):
        """Test that the model validates correctly."""
        sorting = OppSorting(
            sort_by=OppSortBy.CREATED_AT,
            sort_order="desc",
        )
        # Should not raise any validation errors
        assert sorting.model_validate(sorting.model_dump()) == sorting

    def test_all_sort_by_values(self):
        """Test that all OppSortBy values work correctly."""
        for sort_by in OppSortBy:
            if sort_by == OppSortBy.CUSTOM:
                # Skip CUSTOM as it requires custom_sort_by
                continue
            sorting = OppSorting(sort_by=sort_by)
            assert sorting.sort_by == sort_by
            assert sorting.sort_order == "desc"  # default


class TestSortedResultsInfo:
    """Test SortedResultsInfo class."""

    def test_required_fields(self):
        """Test SortedResultsInfo with required fields."""
        sort_info = SortedResultsInfo(
            sort_by="title",
            sort_order="asc",
        )
        assert sort_info.sort_by == "title"
        assert sort_info.sort_order == "asc"
        assert sort_info.custom_sort_by is None
        assert sort_info.errors == []

    def test_with_custom_sort_by(self):
        """Test SortedResultsInfo with custom_sort_by."""
        sort_info = SortedResultsInfo(
            sort_by="custom",
            sort_order="desc",
            custom_sort_by="customField",
        )
        assert sort_info.sort_by == "custom"
        assert sort_info.sort_order == "desc"
        assert sort_info.custom_sort_by == "customField"
        assert sort_info.errors == []

    def test_with_errors(self):
        """Test SortedResultsInfo with errors."""
        errors = ["Invalid sort field", "Sort order not supported"]
        sort_info = SortedResultsInfo(
            sort_by="title",
            sort_order="asc",
            errors=errors,
        )
        assert sort_info.sort_by == "title"
        assert sort_info.sort_order == "asc"
        assert sort_info.errors == errors

    def test_json_serialization(self):
        """Test JSON serialization with aliases."""
        sort_info = SortedResultsInfo(
            sort_by="lastModifiedAt",
            sort_order="desc",
            custom_sort_by="customField",
            errors=["Warning: field not found"],
        )
        data = sort_info.model_dump(by_alias=True)
        assert data["sortBy"] == "lastModifiedAt"
        assert data["sortOrder"] == "desc"
        assert data["customSortBy"] == "customField"
        assert data["errors"] == ["Warning: field not found"]

    def test_default_errors_list(self):
        """Test that errors defaults to empty list."""
        sort_info = SortedResultsInfo(
            sort_by="title",
            sort_order="asc",
        )
        assert sort_info.errors == []

    def test_with_none_custom_sort_by(self):
        """Test SortedResultsInfo with explicit None custom_sort_by."""
        sort_info = SortedResultsInfo(
            sort_by="title",
            sort_order="asc",
            custom_sort_by=None,
        )
        assert sort_info.custom_sort_by is None

    def test_model_validation(self):
        """Test that the model validates correctly."""
        sort_info = SortedResultsInfo(
            sort_by="createdAt",
            sort_order="desc",
        )
        # Should not raise any validation errors
        assert sort_info.model_validate(sort_info.model_dump()) == sort_info
