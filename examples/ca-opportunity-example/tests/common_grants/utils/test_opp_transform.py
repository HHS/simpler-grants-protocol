"""Tests for the opportunity transformer module."""

import uuid
from datetime import date, datetime
from typing import Any

import pytest
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.models import OppStatusOptions

from common_grants.utils.opp_transform import OpportunityTransformer


class TestOpportunityTransformer:
    """Test the OpportunityTransformer class."""

    @pytest.fixture
    def transformer(self) -> OpportunityTransformer:
        """Create an OpportunityTransformer instance for testing."""
        return OpportunityTransformer()

    @pytest.fixture
    def sample_source_data(self) -> dict[str, Any]:
        """Create sample source data for testing."""
        return {
            "Title": "Test Grant Opportunity",
            "Description": "A test grant for educational purposes",
            "Status": "active",
            "EstAvailFunds": "1000000",
            "EstAmounts": "50000",
            "OpenDate": "2024-01-15",
            "ApplicationDeadline": "2024-03-15",
            "ExpAwardDate": "2024-06-30",
            "GrantURL": "https://example.com/grant",
            "PortalID": "PORTAL123",
            "AgencyDept": "Education Department",
            "Categories": "Education, Technology",
            "CategorySuggestion": "STEM Education",
            "Purpose": "Support STEM education initiatives",
            "AgencyURL": "https://education.gov",
            "ApplicantType": "Non-profit organizations",
            "ApplicantTypeNotes": "Must be registered 501(c)(3)",
            "Geography": "California",
            "LastUpdated": "2024-01-01 10:00:00",
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
        malformed_data = [{"invalid": "data", "PortalID": "MALFORMED123"}]

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
            == "Opportunity is actively accepting applications"
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
        assert funding["minAwardAmount"]["amount"] == "50000"
        assert funding["minAwardAmount"]["currency"] == "USD"
        assert funding["maxAwardAmount"]["amount"] == "50000"
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
        assert key_dates["appOpens"]["date"] == date(2024, 1, 15)
        assert (
            key_dates["appOpens"]["description"]
            == "Applications accepted beginning this date"
        )

        assert key_dates["appDeadline"]["name"] == "Application Deadline"
        assert key_dates["appDeadline"]["date"] == date(2024, 3, 15)
        assert (
            key_dates["appDeadline"]["description"]
            == "Final deadline for all submissions"
        )

        assert "otherDates" in key_dates
        assert "expAwardDate" in key_dates["otherDates"]
        assert key_dates["otherDates"]["expAwardDate"]["name"] == "Expected Award Date"
        assert key_dates["otherDates"]["expAwardDate"]["date"] == date(2024, 6, 30)

    def test_transform_opportunity_custom_fields(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of custom fields."""
        result = transformer.transform_opportunity(sample_source_data)

        assert "customFields" in result
        custom_fields = result["customFields"]

        assert custom_fields["portalID"]["name"] == "Portal ID"
        assert custom_fields["portalID"]["fieldType"] == CustomFieldType.STRING
        assert custom_fields["portalID"]["value"] == "PORTAL123"
        assert custom_fields["portalID"]["description"] == "CA Portal ID"

        assert custom_fields["agencyDept"]["name"] == "Agency Department"
        assert custom_fields["agencyDept"]["fieldType"] == CustomFieldType.STRING
        assert custom_fields["agencyDept"]["value"] == "Education Department"

        assert custom_fields["categories"]["name"] == "Categories"
        assert custom_fields["categories"]["value"] == "Education, Technology"

        assert custom_fields["categorySuggestion"]["value"] == "STEM Education"
        assert custom_fields["purpose"]["value"] == "Support STEM education initiatives"
        assert custom_fields["agencyURL"]["value"] == "https://education.gov"
        assert custom_fields["applicantType"]["value"] == "Non-profit organizations"
        assert (
            custom_fields["applicantTypeNotes"]["value"]
            == "Must be registered 501(c)(3)"
        )
        assert custom_fields["geography"]["value"] == "California"

    def test_transform_opportunity_missing_fields(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with missing optional fields."""
        minimal_data = {
            "Title": "Minimal Grant",
            "Status": "active",
            "PortalID": "MINIMAL123",
        }

        result = transformer.transform_opportunity(minimal_data)

        assert result["title"] == "Minimal Grant"
        assert result["description"] is None
        assert result["status"]["value"] == OppStatusOptions.OPEN
        assert result["source"] is None

    def test_transform_opportunity_different_statuses(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation of different status values."""
        test_cases = [
            ("active", OppStatusOptions.OPEN),
            ("forecasted", OppStatusOptions.FORECASTED),
            ("closed", OppStatusOptions.CLOSED),
            ("unknown", OppStatusOptions.CUSTOM),
        ]

        for status_value, expected_status in test_cases:
            data = {
                "Title": f"Test {status_value}",
                "Status": status_value,
                "PortalID": f"TEST-{status_value.upper()}",
            }
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
            ("active", OppStatusOptions.OPEN),
            ("forecasted", OppStatusOptions.FORECASTED),
            ("closed", OppStatusOptions.CLOSED),
            ("unknown", OppStatusOptions.CUSTOM),
            ("", OppStatusOptions.CUSTOM),
            ("invalid", OppStatusOptions.CUSTOM),
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

    def test_transform_opportunity_with_tbd_dates(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transformation with TBD dates."""
        data_with_tbd = {
            "Title": "TBD Grant",
            "Status": "active",
            "PortalID": "TBD123",
            "OpenDate": "TBD",
            "ApplicationDeadline": "TBD",
            "ExpAwardDate": "TBD",
        }

        result = transformer.transform_opportunity(data_with_tbd)

        assert result["keyDates"]["appOpens"]["date"] == date(2099, 12, 31)
        assert result["keyDates"]["appDeadline"]["date"] == date(2099, 12, 31)
        assert result["keyDates"]["otherDates"]["expAwardDate"]["date"] == date(
            2099,
            12,
            31,
        )
