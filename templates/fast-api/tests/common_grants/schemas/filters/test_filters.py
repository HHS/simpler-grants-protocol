"""Tests for the filter and response models."""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from common_grants_sdk.schemas.fields import EventType, SingleDateEvent
from pydantic import ValidationError

from common_grants.schemas import (
    ArrayOperator,
    DateRange,
    Money,
    MoneyRange,
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
    PaginationBodyParams,
    StringArrayFilter,
)


def test_string_array_filter():
    """Test the StringArrayFilter model."""
    filter_obj = StringArrayFilter(operator=ArrayOperator.IN, value=["open", "closed"])
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


# def test_date_range_filter():
#     """Test the DateRangeFilter model."""
#     pass


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


# def test_money_range_filter():
#     """Test the MoneyRangeFilter model."""
#     pass


# def test_opp_default_filters():
#     """Test the OppDefaultFilters model."""
#     pass


def test_pagination_params():
    """Test the PaginationParams model."""
    # Test defaults
    params = PaginationBodyParams()
    assert params.page == 1
    assert params.page_size == 10

    # Test custom values
    params = PaginationBodyParams(page=2, pageSize=20)
    assert params.page == 2
    assert params.page_size == 20

    # Test invalid values
    with pytest.raises(ValidationError):
        PaginationBodyParams(page=0)
    with pytest.raises(ValidationError):
        PaginationBodyParams(pageSize=0)


def create_test_opportunity():
    """Create a test opportunity for response model tests."""
    now = datetime.now(timezone.utc)
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        description="This opportunity is currently accepting applications",
    )
    funding = OppFunding(
        totalAmountAvailable=Money(amount="1000000.00", currency="USD"),
        minAwardAmount=Money(amount="50000.00", currency="USD"),
        maxAwardAmount=Money(amount="100000.00", currency="USD"),
        minAwardCount=None,
        maxAwardCount=None,
        estimatedAwardCount=None,
    )
    key_dates = OppTimeline(
        postDate=SingleDateEvent(
            name="Opens",
            eventType=EventType.SINGLE_DATE,
            date=date(2024, 1, 1),
            time=None,
            description=None,
        ),
        closeDate=SingleDateEvent(
            name="Closes",
            eventType=EventType.SINGLE_DATE,
            date=date(2024, 12, 31),
            time=None,
            description=None,
        ),
        otherDates=None,
    )
    opp_dict = {
        "id": str(uuid4()),
        "title": "Test Grant",
        "status": status.model_dump(by_alias=True),
        "description": "Test grant description",
        "funding": funding.model_dump(by_alias=True),
        "keyDates": key_dates.model_dump(by_alias=True),
        "source": None,
        "customFields": None,
        "createdAt": now,
        "lastModifiedAt": now,
    }
    return OpportunityBase.model_validate(opp_dict)
