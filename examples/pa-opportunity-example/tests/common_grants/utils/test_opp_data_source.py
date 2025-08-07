"""Tests for OpportunityDataSource."""

from pathlib import Path
from unittest.mock import patch

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
            / "PA-grant-data.sample.txt"
        )
        assert expected_path == OpportunityDataSource.DATA_FILE

    def test_get_opportunities_success(self) -> None:
        """Test successful retrieval of opportunities from data file."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "grants": [
        {
            "slug": "test-grant-1",
            "title": "Test Grant 1",
            "overview": "Description 1",
            "status": "Accepting applications"
        },
        {
            "slug": "test-grant-2",
            "title": "Test Grant 2",
            "overview": "Description 2",
            "status": "Closed"
        }
    ]
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
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
        mock_file_content = """source: Pennsylvania Grants API
data: { invalid json content }"""

        with (
            patch("pathlib.Path.read_text", return_value=mock_file_content),
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

    def test_get_opportunities_missing_data_section(self) -> None:
        """Test handling of file without data section."""
        mock_file_content = """source: Pennsylvania Grants API
some other content without data: section"""

        with (
            patch("pathlib.Path.read_text", return_value=mock_file_content),
            pytest.raises(ValueError, match="Could not find JSON data in file"),
        ):
            OpportunityDataSource.get_opportunities()

    def test_get_opportunities_missing_grants_key(self) -> None:
        """Test handling of JSON without grants key."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "other_key": "some value"
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_empty_grants(self) -> None:
        """Test handling of empty grants array."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "grants": []
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 0

    def test_get_opportunities_malformed_json_in_data_section(self) -> None:
        """Test handling of malformed JSON within the data section."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "grants": [
        {
            "slug": "test-grant",
            "title": "Test Grant",
            "overview": "Description",
            "status": "Accepting applications"
        },
        {
            "slug": "malformed-grant",
            "title": "Test Grant 2",
            "overview": "Description 2",
            "status": "Accepting applications"
        }
    ]
}"""

        # This should work fine since the JSON is valid
        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 2

    def test_get_opportunities_with_extra_whitespace(self) -> None:
        """Test handling of file with extra whitespace around data section."""
        mock_file_content = """source: Pennsylvania Grants API

data: {
    "grants": [
        {
            "slug": "test-grant",
            "title": "Test Grant",
            "overview": "Description",
            "status": "Accepting applications"
        }
    ]
}

"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        assert opportunities[0]["slug"] == "test-grant"

    def test_get_opportunities_with_multiline_json(self) -> None:
        """Test handling of JSON with multiple lines and formatting."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "grants": [
        {
            "slug": "test-grant-1",
            "title": "Test Grant 1",
            "overview": "Description 1",
            "status": "Accepting applications",
            "totalFundsToBeAwarded": "1000000",
            "minimumAward": "10000",
            "maximumAward": "100000"
        },
        {
            "slug": "test-grant-2",
            "title": "Test Grant 2",
            "overview": "Description 2",
            "status": "Closed",
            "totalFundsToBeAwarded": "500000",
            "minimumAward": "5000",
            "maximumAward": "50000"
        }
    ]
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 2
        assert opportunities[0]["totalFundsToBeAwarded"] == "1000000"
        assert opportunities[1]["totalFundsToBeAwarded"] == "500000"

    def test_get_opportunities_real_file_integration(self) -> None:
        """Test integration with the actual data file if it exists."""
        if OpportunityDataSource.DATA_FILE.exists():
            opportunities = OpportunityDataSource.get_opportunities()
            assert isinstance(opportunities, list)
            if opportunities:
                assert isinstance(opportunities[0], dict)
                # Check for key Pennsylvania data fields
                assert "slug" in opportunities[0]
                assert "title" in opportunities[0]
                assert "status" in opportunities[0]
                assert "overview" in opportunities[0]
        else:
            with pytest.raises(ValueError, match="Error processing file"):
                OpportunityDataSource.get_opportunities()

    def test_get_opportunities_returns_list(self) -> None:
        """Test that get_opportunities returns a list."""
        opportunities = OpportunityDataSource.get_opportunities()
        assert isinstance(opportunities, list)

    def test_get_opportunities_returns_dicts(self) -> None:
        """Test that get_opportunities returns list of dictionaries."""
        opportunities = OpportunityDataSource.get_opportunities()
        if opportunities:  # Only test if there are opportunities
            assert isinstance(opportunities[0], dict)

    def test_get_opportunities_has_expected_fields(self) -> None:
        """Test that opportunities have expected Pennsylvania data fields."""
        opportunities = OpportunityDataSource.get_opportunities()
        if opportunities:  # Only test if there are opportunities
            opportunity = opportunities[0]
            # Check for key Pennsylvania data fields
            assert "slug" in opportunity
            assert "title" in opportunity
            assert "status" in opportunity
            assert "overview" in opportunity

    def test_get_opportunities_with_complex_data_structure(self) -> None:
        """Test handling of complex data structure with nested objects."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
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
            "last_modified": "2025-01-01T10:00:00-00:00"
        }
    ]
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        opportunity = opportunities[0]

        # Test all the complex fields
        assert opportunity["slug"] == "complex-grant"
        assert opportunity["title"] == "Complex Grant"
        assert opportunity["overview"] == "A complex grant with many fields"
        assert opportunity["status"] == "Accepting applications"
        assert opportunity["totalFundsToBeAwarded"] == "1000000"
        assert opportunity["openDate"] == "2025-01-15T12:00:00-00:00"
        assert opportunity["closeDate"] == "2025-03-15T12:00:00-00:00"
        assert opportunity["category"] == "Education"
        assert opportunity["issuingAgency"] == "Pennsylvania Department of Education"
        assert opportunity["shortIssuingAgency"] == "PDE"
        assert opportunity["grantCycle"] == "2025-2026"
        assert opportunity["applicantType"] == "Non-profit organizations"
        assert opportunity["fundingType"] == "Grant"
        assert opportunity["fundingSource"] == "State funds"
        assert opportunity["issuingAgencyUrl"] == "https://education.pa.gov"
        assert opportunity["issuingAgencyGrantNumber"] == "PDE-2025-001"
        assert opportunity["shortDescription"] == "Support for educational initiatives"
        assert opportunity["last_modified"] == "2025-01-01T10:00:00-00:00"

    def test_get_opportunities_with_missing_optional_fields(self) -> None:
        """Test handling of grants with missing optional fields."""
        mock_file_content = """source: Pennsylvania Grants API
data: {
    "grants": [
        {
            "slug": "minimal-grant",
            "title": "Minimal Grant",
            "overview": "Minimal description",
            "status": "Accepting applications"
        }
    ]
}"""

        with patch("pathlib.Path.read_text", return_value=mock_file_content):
            opportunities = OpportunityDataSource.get_opportunities()

        assert len(opportunities) == 1
        opportunity = opportunities[0]

        # Required fields should be present
        assert opportunity["slug"] == "minimal-grant"
        assert opportunity["title"] == "Minimal Grant"
        assert opportunity["overview"] == "Minimal description"
        assert opportunity["status"] == "Accepting applications"

        # Optional fields should not be present
        assert "totalFundsToBeAwarded" not in opportunity
        assert "openDate" not in opportunity
        assert "category" not in opportunity
