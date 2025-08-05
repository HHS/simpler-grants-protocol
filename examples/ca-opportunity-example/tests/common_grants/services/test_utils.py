"""Tests for utility functions in the services module."""

from datetime import date
from typing import cast
from uuid import UUID

from common_grants_sdk.schemas.fields import EventType, SingleDateEvent

from common_grants.schemas import (
    OppFilters,
    OppStatusOptions,
)
from common_grants.services.utils import (
    build_applied_filters,
    mock_opportunity,
)


class TestBuildAppliedFilters:
    """Test the build_applied_filters function."""

    def test_build_applied_filters_empty(self) -> None:
        """Test building applied filters with empty filters."""
        filters = OppFilters()
        result = build_applied_filters(filters)
        assert result == {}


class TestMockOpportunity:
    """Test the mock_opportunity function."""

    def test_mock_opportunity_minimal(self) -> None:
        """Test creating a mock opportunity with minimal parameters."""
        opp = mock_opportunity("Test Grant")

        assert opp.title == "Test Grant"
        assert opp.description == "Description for Test Grant"
        assert opp.status.value == OppStatusOptions.OPEN
        assert opp.status.description == "Status for Test Grant"
        assert isinstance(opp.id, UUID)

    def test_mock_opportunity_with_description(self) -> None:
        """Test creating a mock opportunity with custom description."""
        opp = mock_opportunity("Test Grant", description="Custom description")
        assert opp.description == "Custom description"

    def test_mock_opportunity_with_funding(self) -> None:
        """Test creating a mock opportunity with funding information."""
        opp = mock_opportunity(
            "Test Grant",
            total_available=1000000.00,
            min_award_amount=50000.00,
            max_award_amount=100000.00,
            min_award_count=5,
            max_award_count=20,
        )

        assert opp.funding is not None
        assert opp.funding.total_amount_available is not None
        assert opp.funding.total_amount_available.amount == "1000000.0"
        assert opp.funding.total_amount_available.currency == "USD"
        assert opp.funding.min_award_amount is not None
        assert opp.funding.min_award_amount.amount == "50000.0"
        assert opp.funding.max_award_amount is not None
        assert opp.funding.max_award_amount.amount == "100000.0"
        assert opp.funding.min_award_count == 5
        assert opp.funding.max_award_count == 20

    def test_mock_opportunity_with_dates(self) -> None:
        """Test creating a mock opportunity with key dates."""
        app_opens = date(2024, 1, 15)
        app_deadline = date(2024, 3, 15)

        opp = mock_opportunity(
            "Test Grant",
            app_opens=app_opens,
            app_deadline=app_deadline,
        )

        assert opp.key_dates is not None
        assert opp.key_dates.post_date is not None
        post_date_event = cast(SingleDateEvent, opp.key_dates.post_date)
        assert post_date_event.date == app_opens
        assert post_date_event.name == "Application Posted"
        assert post_date_event.event_type == EventType.SINGLE_DATE
        assert opp.key_dates.close_date is not None
        close_date_event = cast(SingleDateEvent, opp.key_dates.close_date)
        assert close_date_event.date == app_deadline
        assert close_date_event.name == "Application Deadline"
        assert close_date_event.event_type == EventType.SINGLE_DATE

    def test_mock_opportunity_with_all_parameters(self) -> None:
        """Test creating a mock opportunity with all parameters."""
        app_opens = date(2024, 1, 15)
        app_deadline = date(2024, 3, 15)

        opp = mock_opportunity(
            "Test Grant",
            description="Comprehensive test grant",
            total_available=1000000.00,
            min_award_amount=50000.00,
            max_award_amount=100000.00,
            min_award_count=5,
            max_award_count=20,
            app_opens=app_opens,
            app_deadline=app_deadline,
        )

        assert opp.title == "Test Grant"
        assert opp.description == "Comprehensive test grant"
        assert opp.funding is not None
        assert opp.key_dates is not None
        assert opp.status.value == OppStatusOptions.OPEN

    def test_mock_opportunity_no_funding_or_dates(self) -> None:
        """Test creating a mock opportunity without funding or dates."""
        opp = mock_opportunity("Test Grant")

        assert opp.funding is None
        assert opp.key_dates is None

    def test_mock_opportunity_partial_funding(self) -> None:
        """Test creating a mock opportunity with partial funding information."""
        opp = mock_opportunity(
            "Test Grant",
            total_available=1000000.00,
            min_award_amount=50000.00,
        )

        assert opp.funding is not None
        assert opp.funding.total_amount_available is not None
        assert opp.funding.total_amount_available.amount == "1000000.0"
        assert opp.funding.min_award_amount is not None
        assert opp.funding.min_award_amount.amount == "50000.0"
        assert opp.funding.max_award_amount is None
        assert opp.funding.min_award_count is None

    def test_mock_opportunity_partial_dates(self) -> None:
        """Test creating a mock opportunity with partial date information."""
        app_opens = date(2024, 1, 15)

        opp = mock_opportunity("Test Grant", app_opens=app_opens)

        assert opp.key_dates is not None
        assert opp.key_dates.post_date is not None
        post_date_event = cast(SingleDateEvent, opp.key_dates.post_date)
        assert post_date_event.date == app_opens
        assert opp.key_dates.close_date is None
