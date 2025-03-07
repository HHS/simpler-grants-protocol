"""Tests for the filter and response models."""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from common_grants.schemas.opportunity import (
    DateRange,
    DateRangeFilter,
    Event,
    Money,
    MoneyRange,
    MoneyRangeFilter,
    OppDefaultFilters,
    OppFilters,
    OppFunding,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityBase,
    OpportunityResponse,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
    PaginationParams,
    StringArrayFilter,
)


def test_string_array_filter():
    """Test the StringArrayFilter model."""
    filter_obj = StringArrayFilter(operator="in", value=["open", "closed"])
    assert filter_obj.operator == "in"
    assert filter_obj.value == ["open", "closed"]


def test_date_range():
    """Test the DateRange model."""
    date_range = DateRange(
        min=date(2024, 1, 1),
        max=date(2024, 12, 31),
    )
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max == date(2024, 12, 31)


def test_date_range_filter():
    """Test the DateRangeFilter model."""
    filter_obj = DateRangeFilter(
        operator="between",
        value=DateRange(
            min=date(2024, 1, 1),
            max=date(2024, 12, 31),
        ),
    )
    assert filter_obj.operator == "between"
    assert filter_obj.value.min == date(2024, 1, 1)
    assert filter_obj.value.max == date(2024, 12, 31)


def test_money_range():
    """Test the MoneyRange model."""
    money_range = MoneyRange(
        min=Money(amount="1000.00", currency="USD"),
        max=Money(amount="5000.00", currency="USD"),
    )
    assert money_range.min is not None
    assert money_range.min.amount == "1000.00"
    assert money_range.max is not None
    assert money_range.max.amount == "5000.00"


def test_money_range_filter():
    """Test the MoneyRangeFilter model."""
    filter_obj = MoneyRangeFilter(
        operator="between",
        value=MoneyRange(
            min=Money(amount="1000.00", currency="USD"),
            max=Money(amount="5000.00", currency="USD"),
        ),
    )
    assert filter_obj.operator == "between"
    assert filter_obj.value.min is not None
    assert filter_obj.value.min.amount == "1000.00"
    assert filter_obj.value.max is not None
    assert filter_obj.value.max.amount == "5000.00"


def test_opp_default_filters():
    """Test the OppDefaultFilters model."""
    filters = OppDefaultFilters(
        status=StringArrayFilter(operator="in", value=["open", "closed"]),
        close_date_range=DateRangeFilter(
            operator="between",
            value=DateRange(
                min=date(2024, 1, 1),
                max=date(2024, 12, 31),
            ),
        ),
        total_funding_available_range=MoneyRangeFilter(
            operator="between",
            value=MoneyRange(
                min=Money(amount="1000.00", currency="USD"),
                max=Money(amount="5000.00", currency="USD"),
            ),
        ),
    )
    assert filters.status is not None
    assert filters.status.value == ["open", "closed"]
    assert filters.close_date_range is not None
    assert filters.close_date_range.value.min == date(2024, 1, 1)
    assert filters.total_funding_available_range is not None
    assert filters.total_funding_available_range.value.max is not None
    assert filters.total_funding_available_range.value.max.amount == "5000.00"


def test_pagination_params():
    """Test the PaginationParams model."""
    # Test defaults
    params = PaginationParams()
    assert params.page == 1
    assert params.page_size == 10

    # Test custom values
    params = PaginationParams(page=2, page_size=20)
    assert params.page == 2
    assert params.page_size == 20

    # Test invalid values
    with pytest.raises(ValidationError):
        PaginationParams(page=0)
    with pytest.raises(ValidationError):
        PaginationParams(page_size=0)


def create_test_opportunity():
    """Create a test opportunity for response model tests."""
    now = datetime.now(timezone.utc)
    return OpportunityBase(
        id=uuid4(),
        title="Test Grant",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            custom_value=None,
            description=None,
        ),
        description="Test grant description",
        funding=OppFunding(
            total_amount_available=Money(amount="1000000.00", currency="USD"),
            min_award_amount=Money(amount="50000.00", currency="USD"),
            max_award_amount=Money(amount="100000.00", currency="USD"),
            min_award_count=None,
            max_award_count=None,
            estimated_award_count=None,
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Opens",
                date=date(2024, 1, 1),
                time=None,
                description=None,
            ),
            app_deadline=Event(
                name="Closes",
                date=date(2024, 12, 31),
                time=None,
                description=None,
            ),
            other_dates=None,
        ),
        source=None,
        custom_fields=None,
        created_at=now,
        last_modified_at=now,
    )


def test_opportunity_response():
    """Test the OpportunityResponse model."""
    opp = create_test_opportunity()
    response = OpportunityResponse(data=opp)
    assert response.data.id == opp.id
    assert response.data.title == opp.title


def test_opportunities_list_response():
    """Test the OpportunitiesListResponse model."""
    opp = create_test_opportunity()
    response = OpportunitiesListResponse(
        data=[opp],
        pagination=PaginationParams(),
        total_count=1,
    )
    assert len(response.data) == 1
    assert response.data[0].id == opp.id
    assert response.pagination.page == 1
    assert response.total_count == 1


def test_opportunities_search_response():
    """Test the OpportunitiesSearchResponse model."""
    opp = create_test_opportunity()
    response = OpportunitiesSearchResponse(
        data=[opp],
        pagination=PaginationParams(),
        total_count=1,
        filters=OppFilters(),
    )
    assert len(response.data) == 1
    assert response.data[0].id == opp.id
    assert response.pagination.page == 1
    assert response.total_count == 1
    assert response.filters is not None
