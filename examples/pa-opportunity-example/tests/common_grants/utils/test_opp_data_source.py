"""Tests for OpportunityDataSource."""

import json
from pathlib import Path
from unittest.mock import mock_open, patch

import pytest

from common_grants.utils.opp_data_source import OpportunityDataSource


class TestOpportunityDataSource:
    """Test cases for OpportunityDataSource."""

    def test_data_file_path(self) -> None:
        """Test that the data file path is correctly constructed."""
        expected_path = (
            Path(__file__).parent.parent.parent.parent
            / "src"
            / "common_grants"
            / "data"
            / "PA-grant-data.sample.json"
        )
        assert expected_path == OpportunityDataSource.DATA_FILE

    def test_get_opportunities_success(self) -> None:
        """Test successful retrieval of opportunities from data file."""
        mock_json_data = {
            "grants": [
                {
                    "slug": "test-grant-1",
                    "title": "Test Grant 1",
                    "overview": "Description 1",
                    "status": "Accepting applications",
                },
                {
                    "slug": "test-grant-2",
                    "title": "Test Grant 2",
                    "overview": "Description 2",
                    "status": "Closed",
                },
            ],
        }

        with patch("pathlib.Path.open", mock_open()), patch(
            "json.load",
            return_value=mock_json_data,
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 2
        assert opportunities[0]["slug"] == "test-grant-1"
        assert opportunities[0]["title"] == "Test Grant 1"
        assert opportunities[0]["overview"] == "Description 1"
        assert opportunities[0]["status"] == "Accepting applications"
        assert opportunities[1]["slug"] == "test-grant-2"
        assert opportunities[1]["title"] == "Test Grant 2"
        assert opportunities[1]["overview"] == "Description 2"
        assert opportunities[1]["status"] == "Closed"

    def test_get_opportunities_invalid_json(self) -> None:
        """Test handling of invalid JSON in data file."""
        with (
            patch("pathlib.Path.open", mock_open()),
            patch("json.load", side_effect=json.JSONDecodeError("Invalid JSON", "", 0)),
            pytest.raises(ValueError, match="Invalid JSON in file"),
        ):
            OpportunityDataSource.get_opportunities()

    def test_get_opportunities_file_read_error(self) -> None:
        """Test handling of file read errors."""
        with (
            patch("pathlib.Path.open", side_effect=FileNotFoundError("File not found")),
            pytest.raises(ValueError, match="Error processing file"),
        ):
            OpportunityDataSource.get_opportunities()

    def test_get_opportunities_missing_grants_key(self) -> None:
        """Test handling of JSON without grants key."""
        mock_json_data = {"other_key": "some value"}

        with patch("pathlib.Path.open", mock_open()), patch(
            "json.load",
            return_value=mock_json_data,
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_empty_grants(self) -> None:
        """Test handling of empty grants array."""
        mock_json_data = {"grants": []}

        with patch("pathlib.Path.open", mock_open()), patch(
            "json.load",
            return_value=mock_json_data,
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_with_complex_data_structure(self) -> None:
        """Test handling of complex data structure with nested objects."""
        mock_json_data = {
            "grants": [
                {
                    "slug": "complex-grant",
                    "title": "Complex Grant",
                    "overview": "A complex grant with many fields",
                    "status": "Accepting applications",
                    "totalFundsToBeAwarded": "1000000",
                    "minimumAward": "10000",
                    "maximumAward": "100000",
                    "openDate": "2025-01-15T12:00:00-00:00",
                    "closeDate": "2025-03-15T12:00:00-00:00",
                    "decisionDate": "2025-06-30T12:00:00-00:00",
                    "anticipatedFundingDate": "2025-07-15T12:00:00-00:00",
                    "linkToApply": "https://example.com/grant",
                    "category": "Education",
                    "issuingAgency": "Pennsylvania Department of Education",
                    "shortIssuingAgency": "PDE",
                    "grantCycle": "2025-2026",
                    "applicantType": "Non-profit organizations",
                    "applicantCategory": "Educational institutions",
                    "eligibility": "Must be registered 501(c)(3)",
                    "fundingType": "Grant",
                    "matchingFundsRequirements": "None required",
                    "fundingSource": "State funds",
                    "issuingAgencyUrl": "https://education.pa.gov",
                    "issuingAgencyGrantNumber": "PDE-2025-001",
                    "populationServedType": "Students",
                    "populationServedGeography": "Pennsylvania",
                    "reportingMonitoring": "Quarterly reports required",
                    "shortDescription": "Support for educational initiatives",
                    "last_modified": "2025-01-01T10:00:00-00:00",
                },
            ],
        }

        with patch("pathlib.Path.open", mock_open()), patch(
            "json.load",
            return_value=mock_json_data,
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        assert opportunities[0]["slug"] == "complex-grant"
        assert opportunities[0]["title"] == "Complex Grant"
        assert opportunities[0]["status"] == "Accepting applications"

    def test_get_opportunities_with_missing_optional_fields(self) -> None:
        """Test handling of grants with missing optional fields."""
        mock_json_data = {
            "grants": [
                {
                    "slug": "minimal-grant",
                    "title": "Minimal Grant",
                    "overview": "Minimal description",
                    "status": "Accepting applications",
                },
            ],
        }

        with patch("pathlib.Path.open", mock_open()), patch(
            "json.load",
            return_value=mock_json_data,
        ):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        assert opportunities[0]["slug"] == "minimal-grant"
        assert opportunities[0]["title"] == "Minimal Grant"
        assert opportunities[0]["overview"] == "Minimal description"
        assert opportunities[0]["status"] == "Accepting applications"

    def test_get_opportunities_real_file_integration(self) -> None:
        """Test integration with the actual data file."""
        opportunities = OpportunityDataSource.get_opportunities()

        # Should return a list
        assert isinstance(opportunities, list)

        # Should have some opportunities
        assert len(opportunities) > 0

        # Each opportunity should be a dictionary
        for opportunity in opportunities:
            assert isinstance(opportunity, dict)

    def test_get_opportunities_returns_list(self) -> None:
        """Test that get_opportunities returns a list."""
        opportunities = OpportunityDataSource.get_opportunities()
        assert isinstance(opportunities, list)

    def test_get_opportunities_returns_dicts(self) -> None:
        """Test that get_opportunities returns list of dictionaries."""
        opportunities = OpportunityDataSource.get_opportunities()
        for opportunity in opportunities:
            assert isinstance(opportunity, dict)

    def test_get_opportunities_has_expected_fields(self) -> None:
        """Test that opportunities have expected fields."""
        opportunities = OpportunityDataSource.get_opportunities()

        if opportunities:  # Only test if there are opportunities
            opportunity = opportunities[0]
            expected_fields = ["slug", "title", "overview", "status"]

            for field in expected_fields:
                assert field in opportunity, f"Missing expected field: {field}"
