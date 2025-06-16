"""
Test module for the CA Grants transformer.

This module contains comprehensive tests for transforming grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

from datetime import datetime, timezone
from uuid import UUID

import pytest
from common_grants_sdk.schemas.models import OppStatusOptions

from ca_common_grants.utils.opp_transform import DateFormat, OpportunityTransformer


@pytest.fixture
def transformer() -> OpportunityTransformer:
    """Create a transformer instance for testing."""
    return OpportunityTransformer()


class TestDateTransformation:
    """Test date transformation functionality."""

    def test_ongoing_with_full_datetime(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test Ongoing case with FULL_DATETIME format."""
        result = transformer.transform_date("Ongoing", DateFormat.LONG)
        expected = datetime(
            2099,
            12,
            31,
            23,
            59,
            59,
            tzinfo=timezone.utc,
        )
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_ongoing_with_date(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test Ongoing case with DATE format."""
        result = transformer.transform_date("Ongoing", DateFormat.SHORT)
        expected = datetime(2099, 12, 31, tzinfo=timezone.utc)
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_iso_format_with_full_datetime(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test ISO format input with FULL_DATETIME output."""
        result = transformer.transform_date(
            "2025-06-10 07:00:00",
            DateFormat.LONG,
        )
        expected = datetime(2025, 6, 10, 7, 0, 0, tzinfo=timezone.utc)
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_iso_format_with_date(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test ISO format input with DATE output."""
        result = transformer.transform_date(
            "2025-06-10 07:00:00",
            DateFormat.SHORT,
        )
        expected = datetime(2025, 6, 10, tzinfo=timezone.utc)
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_mmddyy_format_with_full_datetime(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test MM/DD/YY format input with FULL_DATETIME output."""
        result = transformer.transform_date(
            "12/31/25",
            DateFormat.LONG,
        )
        expected = datetime(
            2025,
            12,
            31,
            23,
            59,
            59,
            tzinfo=timezone.utc,
        )
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_mmddyy_format_with_date(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test MM/DD/YY format input with DATE output."""
        result = transformer.transform_date("12/31/25", DateFormat.SHORT)
        expected = datetime(2025, 12, 31, tzinfo=timezone.utc)
        assert result.replace(tzinfo=timezone.utc) == expected

    def test_invalid_format(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test invalid date format."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            transformer.transform_date("invalid-date", DateFormat.SHORT)

    def test_empty_string(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test empty string input."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            transformer.transform_date("", DateFormat.SHORT)

    def test_none_input(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test None input."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            transformer.transform_date("None", DateFormat.SHORT)


class TestMoneyTransformation:
    """Test money transformation functionality."""

    def test_valid_money_string(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test valid money string transformation."""
        result = transformer.transform_money("$1,234.56")
        assert result == "123456"

    def test_empty_money_string(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test empty money string transformation."""
        result = transformer.transform_money("")
        assert result == "0"

    def test_non_numeric_money_string(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test non-numeric money string transformation."""
        result = transformer.transform_money("N/A")
        assert result == "0"


class TestStatusTransformation:
    """Test status transformation functionality."""

    def test_active_status(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test active status transformation."""
        result = transformer.transform_status("active")
        assert result == OppStatusOptions.OPEN

    def test_forecasted_status(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test forecasted status transformation."""
        result = transformer.transform_status("forecasted")
        assert result == OppStatusOptions.FORECASTED

    def test_closed_status(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test closed status transformation."""
        result = transformer.transform_status("closed")
        assert result == OppStatusOptions.CLOSED

    def test_unknown_status(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test unknown status transformation."""
        result = transformer.transform_status("unknown")
        assert result == OppStatusOptions.CUSTOM


class TestOpportunityTransformation:
    """Test opportunity transformation functionality."""

    def test_transform_opportunity(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test full opportunity transformation."""
        source = {
            "Title": "Test Grant",
            "Description": "Test Description",
            "Status": "active",
            "EstAvailFunds": "$100,000",
            "EstAmounts": "$10,000",
            "OpenDate": "2025-01-01",
            "ApplicationDeadline": "2025-12-31",
            "ExpAwardDate": "2026-01-15",
            "GrantURL": "https://example.com",
            "PortalID": "12345",
            "AgencyDept": "Test Agency",
            "Categories": "Test Category",
            "CategorySuggestion": "Test Suggestion",
            "Purpose": "Test Purpose",
            "AgencyURL": "https://agency.com",
            "ApplicantType": "Test Type",
            "ApplicantTypeNotes": "Test Notes",
            "Geography": "Test Geography",
            "LastUpdated": "2025-01-01 12:00:00",
        }

        result = transformer.transform_opportunity(source)

        # Verify basic fields
        assert isinstance(result["id"], UUID)
        assert result["title"] == "Test Grant"
        assert result["description"] == "Test Description"
        assert result["status"]["value"] == OppStatusOptions.OPEN

        # Verify funding information
        assert result["funding"]["totalAmountAvailable"]["amount"] == "100000"
        assert result["funding"]["minAwardAmount"]["amount"] == "10000"
        assert result["funding"]["maxAwardAmount"]["amount"] == "10000"
        assert result["funding"]["totalAmountAvailable"]["currency"] == "USD"

        # Verify key dates
        assert (
            result["keyDates"]["appOpens"]["date"]
            == datetime(2025, 1, 1, tzinfo=timezone.utc).date()
        )
        assert (
            result["keyDates"]["appDeadline"]["date"]
            == datetime(2025, 12, 31, tzinfo=timezone.utc).date()
        )
        assert (
            result["keyDates"]["otherDates"]["expAwardDate"]["date"]
            == datetime(2026, 1, 15, tzinfo=timezone.utc).date()
        )

        # Verify custom fields
        assert result["customFields"]["portalID"]["value"] == "12345"
        assert result["customFields"]["agencyDept"]["value"] == "Test Agency"
        assert result["customFields"]["categories"]["value"] == "Test Category"
        assert (
            result["customFields"]["categorySuggestion"]["value"] == "Test Suggestion"
        )
        assert result["customFields"]["purpose"]["value"] == "Test Purpose"
        assert result["customFields"]["agencyURL"]["value"] == "https://agency.com"
        assert result["customFields"]["applicantType"]["value"] == "Test Type"
        assert result["customFields"]["applicantTypeNotes"]["value"] == "Test Notes"
        assert result["customFields"]["geography"]["value"] == "Test Geography"

        # Verify source
        assert result["source"] == "https://example.com"

        # Verify timestamps
        d = datetime(2025, 1, 1, 12, 0, 0)  # noqa: DTZ001
        assert result["createdAt"] == d
        assert result["lastModifiedAt"] == d

    def test_transform_opportunity_with_minimal_data(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test opportunity transformation with minimal data."""
        source = {
            "Title": "Minimal Grant",
            "Status": "active",
            "LastUpdated": "2025-01-01 12:00:00",
            "OpenDate": "2025-01-01",
            "ApplicationDeadline": "2025-12-31",
            "ExpAwardDate": "2026-01-15",
        }

        result = transformer.transform_opportunity(source)

        # Verify basic fields
        assert isinstance(result["id"], UUID)
        assert result["title"] == "Minimal Grant"
        assert result["status"]["value"] == OppStatusOptions.OPEN

        # Verify default values
        assert result["funding"]["totalAmountAvailable"]["amount"] == "0"
        assert result["funding"]["minAwardAmount"]["amount"] == "0"
        assert result["funding"]["maxAwardAmount"]["amount"] == "0"

        # Verify key dates
        assert (
            result["keyDates"]["appOpens"]["date"]
            == datetime(2025, 1, 1, tzinfo=timezone.utc).date()
        )
        assert (
            result["keyDates"]["appDeadline"]["date"]
            == datetime(2025, 12, 31, tzinfo=timezone.utc).date()
        )
        assert (
            result["keyDates"]["otherDates"]["expAwardDate"]["date"]
            == datetime(2026, 1, 15, tzinfo=timezone.utc).date()
        )


class TestEmptyDataTransformation:
    """Test empty data transformation functionality."""

    def test_transform_opportunities_with_empty_data(
        self,
        transformer: OpportunityTransformer,
    ) -> None:
        """Test transforming empty data."""
        empty_data = []
        result = transformer.transform_opportunities(empty_data)
        assert len(result) == 0
