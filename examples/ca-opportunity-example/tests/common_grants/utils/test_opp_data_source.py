"""Tests for the opportunity data source module."""

import json
from pathlib import Path
from unittest.mock import mock_open, patch

import pytest

from common_grants.utils.opp_data_source import OpportunityDataSource


class TestOpportunityDataSource:
    """Test the OpportunityDataSource class."""

    def test_data_file_path(self) -> None:
        """Test that the data file path is correctly constructed."""
        data_source = OpportunityDataSource()
        expected_path = (
            Path(__file__).parent.parent.parent.parent
            / "src"
            / "common_grants"
            / "data"
            / "111c8c88-21f6-453c-ae2c-b4785a0624f5.json"
        )
        assert expected_path == data_source.DATA_FILE

    def test_get_opportunities_success(self) -> None:
        """Test successful retrieval of opportunities from data file."""
        mock_data = {
            "fields": [
                {"id": "Title"},
                {"id": "Description"},
                {"id": "Status"},
            ],
            "records": [
                ["Grant 1", "Description 1", "active"],
                ["Grant 2", "Description 2", "closed"],
            ],
        }

        with (
            patch("builtins.open", mock_open(read_data=json.dumps(mock_data))),
            patch("pathlib.Path.read_text", return_value=json.dumps(mock_data)),
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 2
        assert opportunities[0]["Title"] == "Grant 1"
        assert opportunities[0]["Description"] == "Description 1"
        assert opportunities[0]["Status"] == "active"
        assert opportunities[1]["Title"] == "Grant 2"
        assert opportunities[1]["Description"] == "Description 2"
        assert opportunities[1]["Status"] == "closed"

    def test_get_opportunities_invalid_json(self) -> None:
        """Test handling of invalid JSON in data file."""
        with (
            patch("pathlib.Path.read_text", return_value="invalid json"),
            pytest.raises(ValueError, match="Invalid JSON in file"),
        ):
            OpportunityDataSource.get_opportunities()

    def test_get_opportunities_file_read_error(self) -> None:
        """Test handling of file read errors."""
        with (
            patch(
                "pathlib.Path.read_text",
                side_effect=FileNotFoundError("File not found"),
            ),
            pytest.raises(ValueError, match="Error processing file"),
        ):
            OpportunityDataSource.get_opportunities()

    def test_get_opportunities_missing_fields(self) -> None:
        """Test handling of data with missing fields section."""
        mock_data = {
            "records": [
                ["Grant 1", "Description 1", "active"],
            ],
        }

        with patch("pathlib.Path.read_text", return_value=json.dumps(mock_data)):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        assert len(opportunities[0]) == 0

    def test_get_opportunities_missing_records(self) -> None:
        """Test handling of data with missing records section."""
        mock_data = {
            "fields": [
                {"id": "Title"},
                {"id": "Description"},
            ],
        }

        with patch("pathlib.Path.read_text", return_value=json.dumps(mock_data)):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_empty_data(self) -> None:
        """Test handling of empty data file."""
        mock_data = {
            "fields": [],
            "records": [],
        }

        with patch("pathlib.Path.read_text", return_value=json.dumps(mock_data)):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_mismatched_field_count(self) -> None:
        """Test handling of records with mismatched field counts."""
        mock_data = {
            "fields": [
                {"id": "Title"},
                {"id": "Description"},
            ],
            "records": [
                ["Grant 1"],
                ["Grant 2", "Description 2", "extra"],
            ],
        }

        with patch("pathlib.Path.read_text", return_value=json.dumps(mock_data)):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 2
        assert opportunities[0]["Title"] == "Grant 1"
        assert "Description" not in opportunities[0]
        assert opportunities[1]["Title"] == "Grant 2"
        assert opportunities[1]["Description"] == "Description 2"

    def test_get_opportunities_real_file_integration(self) -> None:
        """Test integration with the actual data file if it exists."""
        data_source = OpportunityDataSource()

        if data_source.DATA_FILE.exists():
            opportunities = OpportunityDataSource.get_opportunities()
            assert isinstance(opportunities, list)
            if opportunities:
                assert isinstance(opportunities[0], dict)
        else:
            with pytest.raises(ValueError, match="Error processing file"):
                OpportunityDataSource.get_opportunities()
