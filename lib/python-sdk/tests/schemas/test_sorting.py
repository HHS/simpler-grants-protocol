"""Tests for sorting schemas."""

from common_grants_sdk.schemas import SortedResultsInfo


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
