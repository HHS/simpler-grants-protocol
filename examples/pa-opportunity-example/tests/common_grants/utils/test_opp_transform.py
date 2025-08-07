"""Tests for OpportunityTransformer."""

import uuid
from datetime import date, datetime
from typing import Any

import pytest
from common_grants_sdk.schemas.fields import CustomFieldType
from common_grants_sdk.schemas.models import OppStatusOptions

from common_grants.utils.opp_transform import OpportunityTransformer


class TestOpportunityTransformer:
    """Test cases for OpportunityTransformer."""

    @pytest.fixture
    def transformer(self) -> OpportunityTransformer:
        """Create an OpportunityTransformer instance for testing."""
        return OpportunityTransformer()

    @pytest.fixture
    def sample_source_data(self) -> dict[str, Any]:
        """Create sample source data for testing."""
        return {
            "slug": "test-grant-opportunity",
            "title": "Test Grant Opportunity",
            "overview": "A test grant for educational purposes",
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
        }

    def test_transformer_initialization(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test that the transformer initializes correctly."""
        assert transformer is not None

    def test_transform_opportunities_success(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test successful transformation of opportunities list."""
        source_data = [sample_source_data]
        result = transformer.transform_opportunities(source_data)

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["title"] == "Test Grant Opportunity"
        assert result[0]["description"] == "A test grant for educational purposes"

    def test_transform_opportunities_empty_list(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation of empty opportunities list."""
        result = transformer.transform_opportunities([])
        assert isinstance(result, list)
        assert len(result) == 0

    def test_transform_opportunities_transformation_error(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test handling of transformation errors."""
        malformed_data = [{"invalid": "data"}]

        result = transformer.transform_opportunities(malformed_data)
        assert isinstance(result, list)
        assert len(result) == 1

    def test_transform_opportunity_basic_fields(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of basic opportunity fields."""
        result = transformer.transform_opportunity(sample_source_data)

        assert result["title"] == "Test Grant Opportunity"
        assert result["description"] == "A test grant for educational purposes"
        assert result["status"]["value"] == OppStatusOptions.OPEN
        assert (
            result["status"]["description"]
            == "Opportunity status from Pennsylvania Grants API"
        )
        assert result["source"] == "https://example.com/grant"

    def test_transform_opportunity_funding(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of funding information."""
        result = transformer.transform_opportunity(sample_source_data)

        assert "funding" in result
        funding = result["funding"]
        assert funding["totalAmountAvailable"]["amount"] == "1000000"
        assert funding["totalAmountAvailable"]["currency"] == "USD"
        assert funding["minAwardAmount"]["amount"] == "10000"
        assert funding["minAwardAmount"]["currency"] == "USD"
        assert funding["maxAwardAmount"]["amount"] == "100000"
        assert funding["maxAwardAmount"]["currency"] == "USD"

    def test_transform_opportunity_key_dates(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of key dates."""
        result = transformer.transform_opportunity(sample_source_data)

        assert "keyDates" in result
        key_dates = result["keyDates"]

        assert key_dates["appOpens"]["name"] == "Application Opens"
        assert key_dates["appOpens"]["date"] == date(2025, 1, 15)
        assert (
            key_dates["appOpens"]["description"]
            == "Applications accepted beginning this date"
        )

        assert key_dates["appDeadline"]["name"] == "Application Deadline"
        assert key_dates["appDeadline"]["date"] == date(2025, 3, 15)
        assert (
            key_dates["appDeadline"]["description"]
            == "Final deadline for all submissions"
        )

        assert "otherDates" in key_dates
        assert "decisionDate" in key_dates["otherDates"]
        assert key_dates["otherDates"]["decisionDate"]["name"] == "Decision Date"
        assert key_dates["otherDates"]["decisionDate"]["date"] == date(2025, 6, 30)
        assert (
            key_dates["otherDates"]["decisionDate"]["description"]
            == "Expected date of award decision."
        )

        assert "anticipatedFundingDate" in key_dates["otherDates"]
        assert (
            key_dates["otherDates"]["anticipatedFundingDate"]["name"]
            == "Anticipated Funding Date"
        )
        assert key_dates["otherDates"]["anticipatedFundingDate"]["date"] == date(
            2025,
            7,
            15,
        )
        assert (
            key_dates["otherDates"]["anticipatedFundingDate"]["description"]
            == "Expected date of funding disbursement."
        )

    def test_transform_opportunity_custom_fields(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of custom fields."""
        result = transformer.transform_opportunity(sample_source_data)

        assert "customFields" in result
        custom_fields = result["customFields"]

        # Test all custom fields
        assert custom_fields["slug"]["name"] == "Slug"
        assert custom_fields["slug"]["fieldType"] == CustomFieldType.STRING
        assert custom_fields["slug"]["value"] == "test-grant-opportunity"
        assert custom_fields["slug"]["description"] == "PA Grants API slug identifier"

        assert custom_fields["category"]["name"] == "Category"
        assert custom_fields["category"]["fieldType"] == CustomFieldType.STRING
        assert custom_fields["category"]["value"] == "Education"

        assert custom_fields["issuingAgency"]["name"] == "Issuing Agency"
        assert (
            custom_fields["issuingAgency"]["value"]
            == "Pennsylvania Department of Education"
        )

        assert custom_fields["shortIssuingAgency"]["name"] == "Short Issuing Agency"
        assert custom_fields["shortIssuingAgency"]["value"] == "PDE"

        assert custom_fields["grantCycle"]["name"] == "Grant Cycle"
        assert custom_fields["grantCycle"]["value"] == "2025-2026"

        assert custom_fields["fundingType"]["name"] == "Funding Type"
        assert custom_fields["fundingType"]["value"] == "Grant"

        assert custom_fields["fundingSource"]["name"] == "Funding Source"
        assert custom_fields["fundingSource"]["value"] == "State funds"

        assert custom_fields["issuingAgencyUrl"]["name"] == "Issuing Agency URL"
        assert custom_fields["issuingAgencyUrl"]["value"] == "https://education.pa.gov"

        assert (
            custom_fields["issuingAgencyGrantNumber"]["name"]
            == "Issuing Agency Grant Number"
        )
        assert custom_fields["issuingAgencyGrantNumber"]["value"] == "PDE-2025-001"

        assert custom_fields["shortDescription"]["name"] == "Short Description"
        assert (
            custom_fields["shortDescription"]["value"]
            == "Support for educational initiatives"
        )

    def test_transform_opportunity_missing_fields(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with missing optional fields."""
        minimal_data = {"title": "Minimal Grant", "status": "Accepting applications"}

        result = transformer.transform_opportunity(minimal_data)

        assert result["title"] == "Minimal Grant"
        assert result["description"] is None
        assert result["status"]["value"] == OppStatusOptions.OPEN
        assert result["source"] is None

        # Check that missing custom fields are handled gracefully
        custom_fields = result["customFields"]
        assert custom_fields["slug"]["value"] is None
        assert custom_fields["category"]["value"] is None
        assert custom_fields["issuingAgency"]["value"] is None

    def test_transform_opportunity_different_statuses(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation of different status values."""
        test_cases = [
            ("Accepting applications", OppStatusOptions.OPEN),
            ("accepting applications", OppStatusOptions.OPEN),  # Case insensitive
            ("Closed", OppStatusOptions.CLOSED),
            ("closed", OppStatusOptions.CLOSED),  # Case insensitive
            ("Forecasted", OppStatusOptions.FORECASTED),
            ("forecasted", OppStatusOptions.FORECASTED),  # Case insensitive
            ("unknown", OppStatusOptions.CUSTOM),
            ("", OppStatusOptions.CUSTOM),
            ("invalid", OppStatusOptions.CUSTOM),
        ]

        for status_value, expected_status in test_cases:
            data = {"title": f"Test {status_value}", "status": status_value}
            result = transformer.transform_opportunity(data)
            assert result["status"]["value"] == expected_status

    def test_transform_money_strip_non_digits(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test the transform_money method."""
        test_cases = [
            ("$1,000,000", "1000000"),
            ("50000.00", "5000000"),
            ("$50,000 USD", "50000"),
            ("1000", "1000"),
            ("", "0"),
            ("abc", "0"),
            ("$1,234.56", "123456"),
            ("$0", "0"),
            ("N/A", "0"),
        ]

        for input_value, expected_output in test_cases:
            result = transformer.transform_money(input_value)
            assert result == expected_output

    def test_transform_status_all_values(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test the transform_status method with all possible values."""
        test_cases = [
            ("Accepting applications", OppStatusOptions.OPEN),
            ("accepting applications", OppStatusOptions.OPEN),
            ("Closed", OppStatusOptions.CLOSED),
            ("closed", OppStatusOptions.CLOSED),
            ("Forecasted", OppStatusOptions.FORECASTED),
            ("forecasted", OppStatusOptions.FORECASTED),
            ("unknown", OppStatusOptions.CUSTOM),
            ("", OppStatusOptions.CUSTOM),
            ("invalid", OppStatusOptions.CUSTOM),
            ("pending", OppStatusOptions.CUSTOM),
            ("draft", OppStatusOptions.CUSTOM),
        ]

        for status_value, expected_status in test_cases:
            result = transformer.transform_status(status_value)
            assert result == expected_status

    def test_transform_opportunity_id_consistency(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test that opportunity IDs are consistent for the same data."""
        result1 = transformer.transform_opportunity(sample_source_data)
        result2 = transformer.transform_opportunity(sample_source_data)

        assert result1["id"] == result2["id"]
        assert isinstance(result1["id"], uuid.UUID)

    def test_transform_opportunity_timestamps(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of timestamps."""
        result = transformer.transform_opportunity(sample_source_data)

        assert "createdAt" in result
        assert "lastModifiedAt" in result
        assert isinstance(result["createdAt"], datetime)
        assert isinstance(result["lastModifiedAt"], datetime)

    def test_parse_date_iso_format(self, transformer: OpportunityTransformer) -> None:
        """Test date parsing for ISO format dates."""
        result = transformer.parse_date("2025-01-01T12:00:00-00:00")
        assert result.year == 2025
        assert result.month == 1
        assert result.day == 1
        assert result.hour == 12
        assert result.tzinfo is not None

    def test_parse_date_with_z_format(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test date parsing for ISO format with Z timezone."""
        result = transformer.parse_date("2025-01-01T12:00:00Z")
        assert result.year == 2025
        assert result.month == 1
        assert result.day == 1
        assert result.hour == 12
        assert result.tzinfo is not None

    def test_parse_date_with_timezone_offset(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test date parsing for ISO format with timezone offset."""
        result = transformer.parse_date("2025-01-01T12:00:00+05:00")
        assert result.year == 2025
        assert result.month == 1
        assert result.day == 1
        assert result.hour == 12
        assert result.tzinfo is not None

    def test_parse_date_none_input(self, transformer: OpportunityTransformer) -> None:
        """Test date parsing for None input returns future date."""
        result = transformer.parse_date(None)
        assert result.year == 2099
        assert result.month == 12
        assert result.day == 31
        assert result.tzinfo is not None

    def test_parse_date_empty_string(self, transformer: OpportunityTransformer) -> None:
        """Test date parsing for empty string returns future date."""
        result = transformer.parse_date("")
        assert result.year == 2099
        assert result.month == 12
        assert result.day == 31
        assert result.tzinfo is not None

    def test_parse_date_whitespace_string(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test date parsing for whitespace-only string returns future date."""
        result = transformer.parse_date("   ")
        assert result.year == 2099
        assert result.month == 12
        assert result.day == 31
        assert result.tzinfo is not None

    def test_parse_date_invalid_format_raises_error(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test date parsing for invalid format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid ISO date format"):
            transformer.parse_date("invalid-date")

    def test_parse_date_with_tbd_values(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test date parsing with TBD-like values returns future date."""
        test_cases = ["TBD", "TBA", "ongoing", "pending", "to be determined"]

        for tbd_value in test_cases:
            with pytest.raises(ValueError, match="Invalid ISO date format"):
                transformer.parse_date(tbd_value)

    def test_transform_opportunity_with_missing_dates(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with missing date fields."""
        data_without_dates = {
            "title": "No Date Grant",
            "status": "Accepting applications",
            # No date fields provided
        }

        result = transformer.transform_opportunity(data_without_dates)

        # All dates should default to far future date
        assert result["keyDates"]["appOpens"]["date"] == date(2099, 12, 31)
        assert result["keyDates"]["appDeadline"]["date"] == date(2099, 12, 31)
        assert result["keyDates"]["otherDates"]["decisionDate"]["date"] == date(
            2099,
            12,
            31,
        )
        assert result["keyDates"]["otherDates"]["anticipatedFundingDate"][
            "date"
        ] == date(2099, 12, 31)

    def test_transform_opportunity_with_zero_funding(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with zero funding amounts."""
        data_with_zero_funding = {
            "title": "Zero Funding Grant",
            "status": "Accepting applications",
            "totalFundsToBeAwarded": "0",
            "minimumAward": "0",
            "maximumAward": "0",
        }

        result = transformer.transform_opportunity(data_with_zero_funding)

        funding = result["funding"]
        assert funding["totalAmountAvailable"]["amount"] == "0"
        assert funding["minAwardAmount"]["amount"] == "0"
        assert funding["maxAwardAmount"]["amount"] == "0"

    def test_transform_opportunity_with_missing_funding(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with missing funding fields."""
        data_without_funding = {
            "title": "No Funding Grant",
            "status": "Accepting applications",
            # No funding fields provided
        }

        result = transformer.transform_opportunity(data_without_funding)

        funding = result["funding"]
        assert funding["totalAmountAvailable"]["amount"] == "0"
        assert funding["minAwardAmount"]["amount"] == "0"
        assert funding["maxAwardAmount"]["amount"] == "0"

    def test_transform_opportunity_custom_fields_with_none_values(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test custom fields handle None values gracefully."""
        data_with_none_custom_fields = {
            "title": "None Custom Fields Grant",
            "status": "Accepting applications",
            "slug": None,
            "category": None,
            "issuingAgency": None,
            "issuingAgencyGrantNumber": None,
        }

        result = transformer.transform_opportunity(data_with_none_custom_fields)

        custom_fields = result["customFields"]
        assert custom_fields["slug"]["value"] is None
        assert custom_fields["category"]["value"] is None
        assert custom_fields["issuingAgency"]["value"] is None
        assert (
            custom_fields["issuingAgencyGrantNumber"]["value"] == "None"
        )  # str(None) = "None"

    def test_transform_opportunity_error_handling(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test error handling during transformation."""
        # Test with completely invalid data
        invalid_data = {"invalid": "data", "status": None}

        result = transformer.transform_opportunity(invalid_data)

        # Should still produce a valid result structure
        assert "id" in result
        assert "title" in result
        assert "status" in result
        assert "funding" in result
        assert "keyDates" in result
        assert "customFields" in result

    def test_parse_url_valid_urls(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test URL validation with valid URLs."""
        valid_urls = [
            "https://example.com",
            "https://grants.pa.gov/Login.aspx",
            "http://localhost:8000",
        ]

        for url in valid_urls:
            result = transformer.parse_url(url)
            assert result is not None, f"Expected {url} to be valid, got None"
            assert result.startswith(
                ("http://", "https://"),
            ), f"Expected {url} to be a valid URL, got {result}"

    def test_parse_url_invalid_urls(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test URL validation with invalid URLs."""
        invalid_urls = [
            "not-a-url",
            "ftp://example.com",
            "",
            None,
        ]

        for url in invalid_urls:
            result = transformer.parse_url(url)
            assert result is None, f"Expected {url} to be invalid, got {result}"

    def test_parse_url_integration(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test URL validation integration with opportunity transformation."""
        # Test with valid URL
        data_with_valid_url = {
            "title": "Test Grant",
            "status": "Accepting applications",
            "linkToApply": "https://grants.pa.gov/Login.aspx",
        }
        result = transformer.transform_opportunity(data_with_valid_url)
        assert result["source"] == "https://grants.pa.gov/Login.aspx"

        # Test with URL that gets URL-encoded (Pydantic accepts and encodes it)
        data_with_encoded_url = {
            "title": "Test Grant",
            "status": "Accepting applications",
            "linkToApply": "https://example.com/path with spaces",
        }
        result = transformer.transform_opportunity(data_with_encoded_url)
        assert result["source"] is not None
        assert result["source"].startswith("https://")

        # Test with truly invalid URL
        data_with_invalid_url = {
            "title": "Test Grant",
            "status": "Accepting applications",
            "linkToApply": "not-a-url",
        }
        result = transformer.transform_opportunity(data_with_invalid_url)
        assert result["source"] is None

        # Test with missing URL
        data_without_url = {
            "title": "Test Grant",
            "status": "Accepting applications",
            # No linkToApply field
        }
        result = transformer.transform_opportunity(data_without_url)
        assert result["source"] is None
