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
        assert result[0].title == "Test Grant Opportunity"
        assert result[0].description == "A test grant for educational purposes"

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

        assert result.title == "Test Grant Opportunity"
        assert result.description == "A test grant for educational purposes"
        assert result.status.value == OppStatusOptions.OPEN
        assert (
            result.status.description
            == "Opportunity is actively accepting applications"
        )
        assert str(result.source) == "https://example.com/grant"

    def test_transform_opportunity_funding(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of funding information."""
        result = transformer.transform_opportunity(sample_source_data)

        assert result.funding is not None
        funding = result.funding
        assert funding.total_amount_available.amount == "1000000"
        assert funding.total_amount_available.currency == "USD"
        assert funding.min_award_amount.amount == "50000"
        assert funding.min_award_amount.currency == "USD"
        assert funding.max_award_amount.amount == "50000"
        assert funding.max_award_amount.currency == "USD"

    def test_transform_opportunity_key_dates(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of key dates."""
        result = transformer.transform_opportunity(sample_source_data)

        assert result.key_dates is not None
        key_dates = result.key_dates

        assert key_dates.post_date is not None
        assert key_dates.post_date.name == "Application Opens"
        assert key_dates.post_date.date == date(2024, 1, 15)
        assert (
            key_dates.post_date.description
            == "Applications accepted beginning this date"
        )

        assert key_dates.close_date is not None
        assert key_dates.close_date.name == "Application Deadline"
        assert key_dates.close_date.date == date(2024, 3, 15)
        assert key_dates.close_date.description == "Final deadline for all submissions"

        assert key_dates.other_dates is not None
        assert "expAwardDate" in key_dates.other_dates
        exp_award = key_dates.other_dates["expAwardDate"]
        assert exp_award.name == "Expected Award Date"
        assert exp_award.date == date(2024, 6, 30)

    def test_transform_opportunity_custom_fields(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of custom fields (serialized via SDK with_custom_fields)."""
        result = transformer.transform_opportunity(sample_source_data)

        assert result.custom_fields is not None
        cf = result.custom_fields

        assert cf.portal_id.name == "Portal ID"
        assert cf.portal_id.field_type == CustomFieldType.STRING
        assert cf.portal_id.value == "PORTAL123"
        assert cf.portal_id.description == "CA Portal ID"

        assert cf.agency_dept.name == "Agency Department"
        assert cf.agency_dept.field_type == CustomFieldType.STRING
        assert cf.agency_dept.value == "Education Department"

        assert cf.categories.name == "Categories"
        assert cf.categories.value == "Education, Technology"

        assert cf.category_suggestion.value == "STEM Education"
        assert cf.purpose.value == "Support STEM education initiatives"
        assert cf.agency_url.value == "https://education.gov"
        assert cf.applicant_type.value == "Non-profit organizations"
        assert cf.applicant_type_notes.value == "Must be registered 501(c)(3)"
        assert cf.geography.value == "California"

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

        assert result.title == "Minimal Grant"
        assert result.description == ""
        assert result.status.value == OppStatusOptions.OPEN
        assert result.source is None

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
            assert result.status.value == expected_status

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

        assert result1.id == result2.id
        assert isinstance(result1.id, uuid.UUID)

    def test_transform_opportunity_timestamps(
        self,
        transformer: OpportunityTransformer,
        sample_source_data: dict[str, Any],
    ) -> None:
        """Test transformation of timestamps."""
        result = transformer.transform_opportunity(sample_source_data)

        assert result.created_at is not None
        assert result.last_modified_at is not None
        assert isinstance(result.created_at, datetime)
        assert isinstance(result.last_modified_at, datetime)

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

        assert result.key_dates is not None
        assert result.key_dates.post_date is not None
        assert result.key_dates.post_date.date == date(2099, 12, 31)
        assert result.key_dates.close_date is not None
        assert result.key_dates.close_date.date == date(2099, 12, 31)
        assert result.key_dates.other_dates is not None
        exp_award = result.key_dates.other_dates["expAwardDate"]
        assert exp_award.date == date(2099, 12, 31)
